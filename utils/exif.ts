// Utility to parse EXIF data from JPEG images to extract GPS coordinates and Timestamp

export async function getExifData(file: File): Promise<{ latitude?: number; longitude?: number; dateTime?: string } | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Check for JPEG SOI marker (0xFFD8)
    if (view.getUint16(0, false) !== 0xFFD8) {
      return null;
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      // Check we aren't reading past end
      if (offset + 1 >= length) break;
      
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 Marker (Exif)
      if (marker === 0xFFE1) {
        if (offset + 1 >= length) break;
        // Length includes the 2 bytes for length itself
        offset += 2;

        if (view.getUint32(offset, false) !== 0x45786966) {
          // Not "Exif"
          return null;
        }

        const tiffStart = offset + 6;
        const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
        
        const getUint16 = (o: number) => view.getUint16(tiffStart + o, littleEndian);
        const getUint32 = (o: number) => view.getUint32(tiffStart + o, littleEndian);

        const ifdOffset = getUint32(4);
        
        // Parse IFD0
        const tags = parseIFD(view, tiffStart, ifdOffset, littleEndian);
        const result: { latitude?: number; longitude?: number; dateTime?: string } = {};
        
        // 1. GPS Info Tag is 34853 (0x8825)
        if (tags[0x8825]) {
          const gpsOffset = tags[0x8825] as number;
          const gpsTags = parseIFD(view, tiffStart, gpsOffset, littleEndian);
          
          const lat = convertDMSToDD(
             gpsTags[2] as number[], 
             gpsTags[1] as string
          );
          const lon = convertDMSToDD(
             gpsTags[4] as number[], 
             gpsTags[3] as string
          );

          if (lat !== null && lon !== null) {
            result.latitude = lat;
            result.longitude = lon;
          }
        }

        // 2. DateTime Parsing
        // Check Exif SubIFD (0x8769) for DateTimeOriginal (0x9003)
        if (tags[0x8769]) {
            const exifOffset = tags[0x8769] as number;
            const exifTags = parseIFD(view, tiffStart, exifOffset, littleEndian);
            
            // 0x9003 is DateTimeOriginal, 0x9004 is DateTimeDigitized
            const dateStr = (exifTags[0x9003] || exifTags[0x9004]) as string;
            if (dateStr && typeof dateStr === 'string') {
                const isoStr = parseExifDate(dateStr);
                if (isoStr) result.dateTime = isoStr;
            }
        }

        // Fallback to IFD0 DateTime (0x0132) which is usually Modification Date, but better than nothing
        if (!result.dateTime && tags[0x0132]) {
             const dateStr = tags[0x0132] as string;
             if (dateStr && typeof dateStr === 'string') {
                const isoStr = parseExifDate(dateStr);
                if (isoStr) result.dateTime = isoStr;
             }
        }
        
        if (Object.keys(result).length > 0) {
            return result;
        }
        
        return null;
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        if (offset + 1 >= length) break;
        offset += view.getUint16(offset, false);
      }
    }
    return null;
  } catch (e) {
    console.warn("EXIF extraction failed", e);
    return null;
  }
}

function parseIFD(view: DataView, tiffStart: number, dirOffset: number, littleEndian: boolean): Record<number, number | number[] | string> {
  const tags: Record<number, number | number[] | string> = {};
  const entries = view.getUint16(tiffStart + dirOffset, littleEndian);
  
  for (let i = 0; i < entries; i++) {
    const entryOffset = tiffStart + dirOffset + 2 + (i * 12);
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    
    // Type 5 (Rational) = 2x Long (8 bytes)
    if (type === 5) { 
       const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
       const rationals = [];
       for (let j = 0; j < count; j++) {
         const num = view.getUint32(tiffStart + valueOffset + (j*8), littleEndian);
         const den = view.getUint32(tiffStart + valueOffset + (j*8) + 4, littleEndian);
         rationals.push(num / den);
       }
       tags[tag] = rationals;
    } else if (type === 2) { // ASCII string
       // If size <= 4, it's stored in the offset field
       let charCodes: number[] = [];
       if (count <= 4) {
           for (let j = 0; j < count; j++) {
               // The offset field is 4 bytes. 
               // For ASCII, we read byte by byte from entryOffset + 8
               charCodes.push(view.getUint8(entryOffset + 8 + j));
           }
       } else {
           const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
           for (let j = 0; j < count; j++) {
               if (tiffStart + valueOffset + j < view.byteLength) {
                 charCodes.push(view.getUint8(tiffStart + valueOffset + j));
               }
           }
       }
       // Remove null terminator if present
       if (charCodes.length > 0 && charCodes[charCodes.length - 1] === 0) {
           charCodes.pop();
       }
       tags[tag] = String.fromCharCode(...charCodes);
    } else if (type === 4 || type === 3) {
       // Offset or value
       tags[tag] = view.getUint32(entryOffset + 8, littleEndian);
    }
  }
  return tags;
}

function convertDMSToDD(dms: number[], ref: string): number | null {
  if (!dms || dms.length < 3 || !ref) return null;
  
  let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
  
  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }
  return dd;
}

function parseExifDate(exifDate: string): string | null {
    // Expected format "YYYY:MM:DD HH:MM:SS"
    const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (match) {
        const [_, y, m, d, h, min, s] = match;
        // Construct ISO string
        return `${y}-${m}-${d}T${h}:${min}:${s}`;
    }
    return null;
}