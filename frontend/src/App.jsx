import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, Send, Cpu, Activity, ThumbsUp, ThumbsDown } from 'lucide-react';


const ConfidenceChip = ({ score }) => {
  const getConfidenceStyle = (score) => {
    if (score >= 0.8) return {
      bgColor: 'bg-green-100', textColor: 'text-green-800',
      borderColor: 'border-green-300', text: 'High'
    };
    if (score >= 0.6) return {
      bgColor: 'bg-yellow-100', textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300', text: 'Medium'
    };
    return {
      bgColor: 'bg-red-100', textColor: 'text-red-800',
      borderColor: 'border-red-300', text: 'Low'
    };
  };
  const { bgColor, textColor, borderColor, text } = getConfidenceStyle(score);
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${bgColor} ${textColor} ${borderColor}`}>
      {text} ({(score * 100).toFixed(0)}%)
    </span>
  );
};

const CodeRow = ({ code, onStatusChange }) => {
    const { code: codeVal, type, description, confidence, status } = code;
    const isReviewed = status === 'accepted' || status === 'rejected';
    return (
        <div className={`p-3 rounded-lg transition-all duration-300 ${status === 'accepted' ? 'bg-green-50 border-l-4 border-green-500' : status === 'rejected' ? 'bg-red-50 opacity-60' : 'bg-white hover:bg-gray-50'} border border-gray-200`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 mb-2 sm:mb-0">
                <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-lg ${status === 'accepted' ? 'text-green-900' : 'text-gray-800'}`}>{codeVal}</span>
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{type}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
                </div>
                <div className="flex items-center gap-3 justify-between">
                <ConfidenceChip score={confidence} />
                {!isReviewed ? (
                    <div className="flex gap-2">
                    <button onClick={() => onStatusChange(codeVal, 'accepted')} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"><ThumbsUp size={18} /></button>
                    <button onClick={() => onStatusChange(codeVal, 'rejected')} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"><ThumbsDown size={18} /></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        {status === 'accepted' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-400" />}
                        <span className={`text-sm font-semibold ${status === 'accepted' ? 'text-green-700' : 'text-red-600'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-lg">
    <Cpu size={40} className="text-blue-500 animate-pulse" />
    <p className="mt-4 text-lg font-semibold text-gray-700">AI is analyzing the clinical note...</p>
    <p className="text-sm text-gray-500">Calling backend services. This may take a moment.</p>
  </div>
);

const sampleNote = `Patient: John Doe\nDOB: 1965-04-12\nVisit Date: 2024-06-27\n\nS: Patient is a 59-year-old male with a history of type 2 diabetes mellitus, presenting for a follow-up. He reports occasional shortness of breath, especially on exertion. He has been compliant with his metformin. No chest pain reported.\n\nO: Vitals: BP 135/85, HR 78, RR 16, SpO2 98% on room air.\nCardiovascular: Regular rate and rhythm, no murmurs.\nLungs: Clear to auscultation bilaterally.\nLabs: A1c is 7.2.\n\nA:\n1. Type 2 Diabetes Mellitus without complications.\n2. Essential hypertension.\n3. Shortness of breath, likely related to deconditioning.\n\nP:\n1. Continue metformin 1000mg BID.\n2. Start Lisinopril 10mg daily for BP control.\n3. Echocardiogram ordered to evaluate cardiac function due to dyspnea.\n4. Patient advised on lifestyle modification and exercise.\n5. Follow-up in 3 months.`;

export default function App() {
    const [note, setNote] = useState(sampleNote);
    const [summary, setSummary] = useState('');
    const [suggestedCodes, setSuggestedCodes] = useState([]);
    const [ncciResult, setNcciResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBillingMessage, setShowBillingMessage] = useState(false);

    const acceptedCodes = suggestedCodes.filter(c => c.status === 'accepted');

    const handleAnalyze = useCallback(async () => {
        if (!note.trim()) {
            setError("Please paste a clinical note to analyze.");
            return;
        }
        setIsLoading(true);
        setError('');
        setNcciResult(null);
        setSuggestedCodes([]);
        setSummary('');

        try {
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/analyze`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note }),
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }

            const data = await response.json();
            setSuggestedCodes(data.codes.map(c => ({ ...c, status: 'suggested' })));
            setSummary(data.summary);

        } catch (err) {
            console.error("API Error:", err);
            setError("Failed to analyze the note. Is the backend server running? Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [note]);

    const handleCodeStatusChange = (codeVal, newStatus) => {
        setSuggestedCodes(prevCodes =>
            prevCodes.map(c => c.code === codeVal ? { ...c, status: newStatus } : c)
        );
        setNcciResult(null);
    };

    const handleNcciCheck = async () => {
        if(acceptedCodes.length === 0) {
            setNcciResult({ status: 'info', message: 'No accepted codes to check.' });
            return;
        }
        setNcciResult({ status: 'loading' });
        setTimeout(() => { 
            const codeSet = new Set(acceptedCodes.map(c => c.code));
            let conflicts = [];
            if (codeSet.has('99214') && codeSet.has('99396')) {
                conflicts.push({ reason: 'Conflict: 99214 and 99396 generally not billable together.' });
            }
            if (conflicts.length > 0) {
                setNcciResult({ status: 'conflict', conflicts });
            } else {
                setNcciResult({ status: 'clean', message: 'No NCCI edit conflicts found.' });
            }
        }, 800);
    };

    const handleExport = () => {
        if (acceptedCodes.length === 0) {
            setError("No codes have been accepted for export.");
            return;
        }
        console.log("--- EXPORTING TO BILLING QUEUE ---");
        console.log(JSON.stringify(acceptedCodes, null, 2));
        setShowBillingMessage(true);
        setTimeout(() => setShowBillingMessage(false), 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">QuickCode <span className="text-blue-600">Rx</span></h1>
                </div>
                <p className="text-sm text-gray-500 hidden md:block">AI-Assisted Medical Coding Assistant</p>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">

                {/* Left Column: Input and Actions */}
                <div className="space-y-6">
                    <div>
                    <label htmlFor="note-input" className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                        <FileText size={20} /> Clinical Note Input
                    </label>
                    <textarea id="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Paste doctor's notes or clinical text here..."
                        className="w-full h-96 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    ></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleAnalyze} disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all"
                    >
                        <Cpu size={20} /> {isLoading ? 'Analyzing...' : 'Analyze Note'}
                    </button>
                    <button onClick={() => setNote('')}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    > Clear Input </button>
                    </div>
                    {error && <p className="text-red-600 text-center p-3 bg-red-100 rounded-lg">{error}</p>}
                </div>

                <div className="space-y-6 mt-8 lg:mt-0">
                    {isLoading ? <LoadingSpinner /> : (
                    <div className="space-y-6">
                        {summary && (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="font-semibold text-gray-700 mb-2">Summary</h3>
                            <p className="text-sm text-gray-600 italic">"{summary}"</p>
                        </div>
                        )}
                        {suggestedCodes.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-700">Code Suggestions</h2>
                            <div className="space-y-3">{suggestedCodes.map(code => <CodeRow key={code.code} code={code} onStatusChange={handleCodeStatusChange} />)}</div>
                        </div>
                        )}
                        {acceptedCodes.length > 0 && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-700">Coder Review & Actions</h2>
                            <div>
                                <button onClick={handleNcciCheck} disabled={ncciResult?.status === 'loading'}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-yellow-300"
                                >
                                <AlertTriangle size={18} /> Run NCCI Edit Check
                                </button>
                                {ncciResult?.status === 'loading' && <p className="text-sm text-yellow-700 mt-2 text-center">Checking for conflicts...</p>}
                                {ncciResult && ncciResult.status !== 'loading' && (
                                <div className={`mt-3 p-3 rounded-lg text-sm ${ncciResult.status === 'clean' ? 'bg-green-100 text-green-800' : ncciResult.status === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                    {ncciResult.status === 'conflict' ? (
                                    <div>
                                        <p className="font-bold">Conflicts Found:</p>
                                        <ul className="list-disc list-inside mt-1">{ncciResult.conflicts.map((c, i) => <li key={i}>{c.reason}</li>)}</ul>
                                    </div>
                                    ) : <p>{ncciResult.message}</p>}
                                </div>
                                )}
                            </div>
                            <div>
                                <button onClick={handleExport}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                > <Send size={20} /> Finalize & Export to Billing </button>
                            </div>
                            </div>
                        )}
                        {!isLoading && suggestedCodes.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                            <Cpu size={48} className="text-gray-300" />
                            <h2 className="mt-4 text-xl font-semibold text-gray-700">Awaiting Analysis</h2>
                            <p className="mt-1 text-gray-500">Paste a clinical note and click "Analyze Note" to see AI-powered coding suggestions.</p>
                            </div>
                        )}
                    </div>
                    )}
                </div>
                </div>
                <div aria-live="assertive"
                className={`fixed bottom-5 right-5 z-20 flex items-center justify-center p-4 rounded-lg shadow-2xl bg-gray-800 text-white transition-all duration-300 ease-in-out ${showBillingMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                >
                    <CheckCircle className="text-green-400 mr-3" />
                    <span className="font-semibold">Codes sent to billing queue!</span>
                </div>
            </main>
        </div>
    );
}
