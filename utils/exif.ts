// Utility to parse EXIF data from JPEG images to extract GPS coordinates

export async function getExifLocation(file: File): Promise<{ latitude: number; longitude: number } | null> {
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
        // const app1Length = view.getUint16(offset, false); 
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
        
        // GPS Info Tag is 34853 (0x8825)
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
            return { latitude: lat, longitude: lon };
          }
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
    
    // Values of types 1, 3, 4 (byte, short, long) fit in the 4 bytes if count is small enough
    // Types 5 (rational) are offsets
    
    // We strictly only care about a few tags for GPS, mostly Rationals (type 5) and Strings/Refs (type 2)
    
    if (type === 5) { // Rational
       const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
       const rationals = [];
       for (let j = 0; j < count; j++) {
         const num = view.getUint32(tiffStart + valueOffset + (j*8), littleEndian);
         const den = view.getUint32(tiffStart + valueOffset + (j*8) + 4, littleEndian);
         rationals.push(num / den);
       }
       tags[tag] = rationals;
    } else if (type === 2) { // ASCII
       // For GPS refs, it's just 2 bytes usually 'N\0'
       const valueOffset = count > 4 ? view.getUint32(entryOffset + 8, littleEndian) : (entryOffset + 8);
       // Simple char read
       const charCode = count > 4 ? view.getUint8(tiffStart + valueOffset) : view.getUint8(valueOffset);
       tags[tag] = String.fromCharCode(charCode);
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