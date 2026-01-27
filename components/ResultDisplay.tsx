import React, { useState, useRef, useEffect } from 'react';
import { ViolationReport } from '../types';
import { Download, MapPin, Clock, AlertCircle, CheckCircle, Send, FileCheck, AlertTriangle, Pencil, Mail, Smartphone, Image as ImageIcon, Scale, Save } from 'lucide-react';

interface ResultDisplayProps {
  report: ViolationReport;
  onReset: () => void;
  isSubmitted: boolean;
  onConfirm: () => void;
  onViolationChange: (value: string) => void;
  onLicensePlateChange: (value: string) => void;
  violationTypes: string[];
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  report, 
  onReset, 
  isSubmitted, 
  onConfirm, 
  onViolationChange,
  onLicensePlateChange,
  violationTypes
}) => {
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const plateInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentEmailBody, setSentEmailBody] = useState<string | null>(null);
  const [sentMethod, setSentMethod] = useState<'auto' | 'draft' | null>(null);

  useEffect(() => {
    if (isEditingPlate && plateInputRef.current) {
      plateInputRef.current.focus();
    }
  }, [isEditingPlate]);

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `violation_report_${report.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const buildEmailContent = () => {
    const subject = `Traffic Violation Report: ${report.analysis.licensePlate} - ${report.userReportedViolation}`;

    const googleMapsUrl = report.location 
      ? `https://www.google.com/maps/search/?api=1&query=${report.location.latitude},${report.location.longitude}`
      : "Location not available";

    let citationText = "";
    if (report.officialCitation) {
      citationText = `\nOfficial Citation Match: ${report.officialCitation.code} - ${report.officialCitation.description} (${report.officialCitation.jurisdiction})`;
    }

    const bodyContent = `To Whom It May Concern,

I would like to report a traffic violation.

Violation: ${report.userReportedViolation}${citationText}
License Plate: ${report.analysis.licensePlate}
Vehicle Description: ${report.analysis.vehicleDescription}
Location: ${googleMapsUrl}
Timestamp: ${new Date(report.timestamp).toLocaleString()}

Please find the photo evidence attached to this email.

Sincerely,
Concerned Citizen`;
    return { subject, bodyContent };
  };

  const handleGmailLaunch = () => {
    const { subject, bodyContent } = buildEmailContent();
    const encodedSubject = encodeURIComponent(subject);
    const body = encodeURIComponent(bodyContent);
    // Open Gmail web interface draft
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${report.recipientEmail}&su=${encodedSubject}&body=${body}`;

    setSentEmailBody(bodyContent);
    setSentMethod('draft');
    window.open(gmailUrl, '_blank');
    onConfirm(); // Update UI to submitted state
  };

  const handleSendAutomatically = async () => {
    const backendBaseUrl = import.meta.env.VITE_GMAIL_SERVER_URL || 'http://localhost:3001';
    const { subject, bodyContent } = buildEmailContent();

    setIsSending(true);
    try {
      const response = await fetch(`${backendBaseUrl}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: report.recipientEmail,
          subject,
          body: bodyContent,
          imageDataUrl: report.imageUrl
        })
      });

      if (response.status === 401) {
        const authResp = await fetch(`${backendBaseUrl}/auth/url`);
        if (authResp.ok) {
          const data = await authResp.json();
          if (data.url) {
            window.open(data.url, '_blank');
            alert('Please authorize Gmail in the new tab, then return here and click "Send Automatically" again.');
          }
        } else {
          alert('Unable to start Gmail authorization. Please try again or use the Gmail draft option.');
        }
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setSentEmailBody(bodyContent);
      setSentMethod('auto');
      onConfirm();
    } catch (err) {
      console.error('Automatic Gmail send failed', err);
      alert('Could not send email automatically. You can still use the Gmail draft option.');
    } finally {
      setIsSending(false);
    }
  };

  const isUnknownPlate = report.analysis.licensePlate === 'UNKNOWN';

  // Determine if the current violation is one of the standard predefined types
  const isCustomViolation = !violationTypes.some(t => t !== 'Other' && t === report.userReportedViolation);
  
  // Value to show in dropdown
  const currentDropdownValue = isCustomViolation ? 'Other' : report.userReportedViolation;

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'Other') {
      // Clear value to let user type
      onViolationChange("");
    } else {
      onViolationChange(value);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      {/* Top Image Preview Section */}
      <div className="relative h-64 sm:h-80 bg-slate-900">
        <img
          src={report.imageUrl}
          alt="Violation Evidence"
          className="w-full h-full object-contain"
        />
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono">
          ID: {report.id}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 sm:p-8 space-y-8">
        
        {/* Status Banners */}
        {isSubmitted && sentMethod === 'auto' && sentEmailBody ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3 text-green-800 shadow-sm animate-fade-in">
             <div className="flex items-start sm:items-center space-x-3">
               <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                 <Send className="w-5 h-5 text-green-600" />
               </div>
               <div>
                 <h3 className="font-semibold text-sm sm:text-base">Report Email Sent via Gmail</h3>
                 <p className="text-xs sm:text-sm text-green-700 mt-1">
                   Your violation report was sent automatically to{' '}
                   <span className="font-mono font-medium bg-green-100 px-1 rounded text-green-900">
                     {report.recipientEmail}
                   </span>
                   .
                 </p>
               </div>
             </div>
             <div className="bg-white border border-green-100 rounded-lg p-3 text-xs text-slate-800 font-mono overflow-x-auto whitespace-pre-wrap">
               {sentEmailBody}
             </div>
          </div>
        ) : isSubmitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start sm:items-center space-x-3 text-green-800 shadow-sm animate-fade-in">
             <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
               <Send className="w-5 h-5 text-green-600" />
             </div>
             <div>
               <h3 className="font-semibold text-sm sm:text-base">Gmail Draft Opened</h3>
               <p className="text-xs sm:text-sm text-green-700 mt-1">
                 Please <span className="font-bold">attach the photo manually</span> and send the email to <span className="font-mono font-medium bg-green-100 px-1 rounded text-green-900">{report.recipientEmail}</span>
               </p>
             </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start sm:items-center space-x-3 text-amber-800 shadow-sm">
             <div className="bg-amber-100 p-2 rounded-full flex-shrink-0">
               <FileCheck className="w-5 h-5 text-amber-600" />
             </div>
             <div>
               <h3 className="font-semibold text-sm sm:text-base">Review Report Details</h3>
               <p className="text-xs sm:text-sm text-amber-700 mt-1">
                 Review below, then open a Gmail draft to <span className="font-mono font-medium bg-amber-100 px-1 rounded text-amber-900">{report.recipientEmail}</span>
               </p>
             </div>
          </div>
        )}

        {/* Main Analysis Badge */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center border-b border-slate-100 pb-6">
          <div className="w-full sm:w-auto">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Detected License Plate</h2>
            
            {isEditingPlate && !isSubmitted ? (
              <div className="flex items-center gap-2">
                 <input
                    ref={plateInputRef}
                    type="text"
                    value={report.analysis.licensePlate}
                    onChange={(e) => onLicensePlateChange(e.target.value)}
                    onBlur={() => setIsEditingPlate(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingPlate(false)}
                    className="text-4xl sm:text-5xl font-bold font-mono tracking-widest text-slate-900 bg-slate-50 border-b-2 border-red-50 outline-none w-full sm:w-auto uppercase"
                 />
                 <button onClick={() => setIsEditingPlate(false)} className="bg-slate-100 p-2 rounded hover:bg-slate-200">
                    <Save className="w-5 h-5 text-slate-600" />
                 </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <div className={`text-4xl sm:text-5xl font-bold font-mono tracking-widest ${isUnknownPlate ? 'text-orange-500' : 'text-slate-900'}`}>
                  {report.analysis.licensePlate}
                </div>
                {!isSubmitted && (
                  <button 
                    onClick={() => setIsEditingPlate(true)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-300 hover:text-red-500 transition-colors"
                    title="Edit License Plate"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            
            {isUnknownPlate && !isEditingPlate && (
               <p className="text-xs text-orange-600 mt-2 flex items-center">
                 <AlertTriangle className="w-3 h-3 mr-1" />
                 Could not clearly identify plate
               </p>
            )}
          </div>
          
          <div className="flex-1 sm:text-right">
             <div className="inline-block text-left sm:text-right">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Vehicle Description</h3>
                <p className="text-lg text-slate-800 font-medium">
                  {report.analysis.vehicleDescription}
                </p>
             </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-4">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-900">Location</h4>
                {report.locationSource === 'image' && (
                  <span className="flex items-center text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium" title="Location extracted from image metadata">
                     <ImageIcon className="w-3 h-3 mr-1" /> From Photo
                  </span>
                )}
                {report.locationSource === 'device' && (
                  <span className="flex items-center text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-medium" title="Location from your device GPS">
                     <Smartphone className="w-3 h-3 mr-1" /> From Device
                  </span>
                )}
              </div>
              
              {report.location ? (
                <div className="text-sm text-slate-600 mt-1 space-y-1">
                  <p className="font-medium text-slate-800">
                    {report.jurisdiction?.city && report.jurisdiction?.state ? `${report.jurisdiction.city}, ${report.jurisdiction.state}` : ''}
                  </p>
                  <p>Lat: {report.location.latitude.toFixed(6)}</p>
                  <p>Long: {report.location.longitude.toFixed(6)}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${report.location.latitude},${report.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs inline-flex items-center mt-1"
                  >
                    View on Map &rarr;
                  </a>
                  {report.locationSource === 'device' && (
                    <p className="text-[10px] text-amber-600 mt-1 italic">
                       *Photo had no GPS data. Using your current location.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Location data unavailable</p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-4">
            <div className="bg-green-100 p-2 rounded-lg text-green-600 mt-1">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                 <h4 className="font-semibold text-slate-900">Timestamp</h4>
                 {report.timestampSource === 'metadata' && (
                  <span className="flex items-center text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium" title="Time extracted from image metadata">
                     <ImageIcon className="w-3 h-3 mr-1" /> From Photo
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {new Date(report.timestamp).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {report.timestampSource === 'metadata' ? 'Taken from photo metadata' : 'Captured at time of report'}
              </p>
            </div>
          </div>

           <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-4 col-span-1 sm:col-span-2">
            <div className="bg-red-100 p-2 rounded-lg text-red-600 mt-1">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 flex items-center justify-between">
                Reported Violation
                {!isSubmitted && !isCustomViolation && (
                   <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex items-center gap-1">
                     <Pencil className="w-3 h-3" /> Edit
                   </span>
                )}
              </h4>
              
              {!isSubmitted ? (
                <div className="mt-2 space-y-2">
                  <select
                    value={currentDropdownValue}
                    onChange={handleDropdownChange}
                    className="w-full text-lg font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.8em' }}
                  >
                    {violationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  {isCustomViolation && (
                    <input
                      type="text"
                      value={report.userReportedViolation}
                      onChange={(e) => onViolationChange(e.target.value)}
                      className="w-full text-lg font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow placeholder:text-slate-300 animate-fade-in italic"
                      placeholder="Add Violation Here"
                      autoFocus
                    />
                  )}
                  
                  <p className="text-xs text-slate-400 mt-1">
                    Verify or select the correct violation type.
                  </p>
                </div>
              ) : (
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {report.userReportedViolation}
                </p>
              )}
              
              {/* Official Citation Card */}
              {report.officialCitation && (
                <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3 animate-fade-in">
                   <div className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-indigo-600 mt-0.5" />
                      <div>
                         <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                           {report.officialCitation.jurisdiction} Official Citation
                         </p>
                         <p className="text-sm font-semibold text-slate-800 mt-1">
                            {report.officialCitation.code}
                         </p>
                         <p className="text-sm text-slate-700">
                           {report.officialCitation.description}
                         </p>
                         {report.officialCitation.fine && (
                            <p className="text-xs font-medium text-indigo-600 mt-1">
                              Estimated Fine: {report.officialCitation.fine}
                            </p>
                         )}
                      </div>
                   </div>
                </div>
              )}
              
              {report.analysis.violationType && report.analysis.violationType !== 'None observed' && (
                <p className="text-xs text-slate-500 mt-2 border-t border-slate-200 pt-2">
                  <span className="font-semibold">AI Note:</span> Visual analysis suggests "{report.analysis.violationType}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          
          {!isSubmitted ? (
            <>
              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={handleSendAutomatically}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <Mail className="w-5 h-5" />
                  {isSending ? 'Sending…' : 'Send Automatically via Gmail'}
                </button>
                <button
                  onClick={handleGmailLaunch}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 px-6 rounded-xl transition-all active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  Open Gmail Draft Instead
                </button>
                <p className="text-[10px] text-center text-slate-500">
                  Automatic sending requires one-time Gmail authorization. Draft option is always available.
                </p>
              </div>
              
              <button
                onClick={onReset}
                className="flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all active:scale-95 h-[48px]"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={downloadJson}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <Download className="w-5 h-5" />
                Download JSON
              </button>
              
              <button
                onClick={onReset}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all active:scale-95"
              >
                <CheckCircle className="w-5 h-5" />
                Submit New Report
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  );
};