import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Save, Trash2, Printer, Plus, FileText, Check, AlertCircle, ArrowLeft
} from 'lucide-react';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function CaseSheetEditor({ initialCaseData, onBackToBookings }) {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [caseDate, setCaseDate] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  
  const [saveStatus, setSaveStatus] = useState('All changes saved to database');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const editorRef = useRef(null);

  // Fetch all existing case sheets
  const fetchCases = async () => {
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      setCases(data);
      return data;
    } catch (err) {
      console.error("Error fetching case sheets:", err);
    }
  };

  useEffect(() => {
    fetchCases().then((loadedCases) => {
      // If we are starting or loading a case
      if (initialCaseData) {
        if (initialCaseData.document_content !== undefined) {
          loadCaseSheet(initialCaseData);
        } else {
          handleCreateNew(
            initialCaseData.client_name,
            initialCaseData.booking_date,
            initialCaseData.id
          );
        }
      } else if (loadedCases && loadedCases.length > 0) {
        // Load the first case sheet by default
        loadCaseSheet(loadedCases[0]);
      } else {
        handleCreateNew();
      }
    });
  }, [initialCaseData]);

  const loadCaseSheet = (c) => {
    setSelectedCaseId(c.id);
    setTitle(c.title);
    setClientName(c.client_name);
    setCaseDate(c.case_date);
    setDocumentContent(c.document_content || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = c.document_content || '<p>Start typing clinical case notes here...</p>';
    }
    setErrorMsg('');
    setSaveStatus('Document loaded');
  };

  const handleCreateNew = (cName = '', cDate = '', bId = null) => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedCaseId('new');
    setTitle(cName ? `Initial Evaluation - ${cName}` : 'New Case Record');
    setClientName(cName || '');
    setCaseDate(cDate || today);
    setDocumentContent('');
    if (editorRef.current) {
      editorRef.current.innerHTML = `
        <h1>Clinical Session Notes</h1>
        <p><strong>Client:</strong> ${cName || '[Client Name]'}</p>
        <p><strong>Date:</strong> ${formatDateToDMY(cDate || today)}</p>
        <hr/>
        <h3>1. Chief Complaints & Symptoms</h3>
        <p>Describe symptoms and physical/emotional states presented by client...</p>
        <h3>2. Mental Status Examination</h3>
        <p>Describe orientation, affect, speech, thought processes...</p>
        <h3>3. Treatment Plan & Next Steps</h3>
        <p>Therapy goals, cognitive homework, next scheduled appointment details...</p>
      `;
    }
    setErrorMsg('');
    setSaveStatus('Draft document initialized');
  };

  const runCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDocumentContent(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    if (!clientName || !caseDate || !title) {
      setErrorMsg('Please specify Client Name, Date, and Document Title.');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving changes...');
    setErrorMsg('');

    const content = editorRef.current ? editorRef.current.innerHTML : documentContent;

    try {
      let res;
      const payload = {
        client_name: clientName,
        case_date: caseDate,
        title: title,
        document_content: content,
        booking_id: initialCaseData ? initialCaseData.id : null
      };

      if (selectedCaseId === 'new') {
        res = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/cases/${selectedCaseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save case sheet.');

      setSaveStatus('All changes saved to database');
      const updatedList = await fetchCases();
      
      if (selectedCaseId === 'new') {
        setSelectedCaseId(data.caseId);
      }
    } catch (err) {
      setErrorMsg(err.message);
      setSaveStatus('Error saving document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedCaseId === 'new') {
      handleCreateNew();
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this clinical case sheet?")) return;

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete.");

      const updated = await fetchCases();
      if (updated && updated.length > 0) {
        loadCaseSheet(updated[0]);
      } else {
        handleCreateNew();
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const content = editorRef.current ? editorRef.current.innerHTML : documentContent;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Case Sheet - ${clientName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 2in; color: #333; line-height: 1.6; }
            h1 { font-family: 'Playfair Display', serif; text-align: center; border-bottom: 2px solid #5c4033; padding-bottom: 10px; }
            hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
            h3 { color: #5c4033; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div>${content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="casesheet-grid">
      {/* Sidebar: Case Sheets Archive */}
      <div style={{ display: 'flex', flexType: 'column', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', alignSelf: 'start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '1.1rem' }}>Case Archives</h4>
          <button 
            onClick={() => handleCreateNew()} 
            className="btn btn-primary"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
            title="Create New Case Sheet"
          >
            <Plus size={16} />
          </button>
        </div>

        {onBackToBookings && (
          <button 
            onClick={onBackToBookings} 
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.5rem', width: '100%', gap: '0.25rem' }}
          >
            <ArrowLeft size={14} /> Back to Bookings
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '450px', overflowY: 'auto', marginTop: '0.5rem' }}>
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => loadCaseSheet(c)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${selectedCaseId === c.id ? 'var(--accent)' : 'var(--border-color)'}`,
                background: selectedCaseId === c.id ? 'var(--bg-secondary)' : 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <FileText size={14} className="text-light" />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                  {c.client_name}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                {formatDateToDMY(c.case_date)} | {c.title.substring(0, 20)}...
              </div>
            </div>
          ))}
          {cases.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', padding: '1rem' }}>
              No cases recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Google Doc Workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Document Properties Header */}
        <div className="casesheet-header-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Document Title</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Session 1: Initial Diagnosis" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Client Name</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Client's Full Name" 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Session Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={caseDate}
              onChange={(e) => setCaseDate(e.target.value)}
            />
          </div>
        </div>

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', background: 'rgba(201, 122, 122, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Doc Simulator Editor Card */}
        <div className="gdoc-container">
          {/* Docs Toolbar */}
          <div className="gdoc-toolbar">
            <div className="gdoc-tool-group">
              <button onClick={() => runCommand('bold')} className="gdoc-btn" title="Bold"><Bold size={16} /></button>
              <button onClick={() => runCommand('italic')} className="gdoc-btn" title="Italic"><Italic size={16} /></button>
              <button onClick={() => runCommand('underline')} className="gdoc-btn" title="Underline"><Underline size={16} /></button>
            </div>
            
            <div className="gdoc-tool-group">
              <button onClick={() => runCommand('justifyLeft')} className="gdoc-btn" title="Align Left"><AlignLeft size={16} /></button>
              <button onClick={() => runCommand('justifyCenter')} className="gdoc-btn" title="Align Center"><AlignCenter size={16} /></button>
              <button onClick={() => runCommand('justifyRight')} className="gdoc-btn" title="Align Right"><AlignRight size={16} /></button>
              <button onClick={() => runCommand('justifyFull')} className="gdoc-btn" title="Justify"><AlignJustify size={16} /></button>
            </div>

            <div className="gdoc-tool-group">
              <button onClick={() => runCommand('insertUnorderedList')} className="gdoc-btn" title="Bulleted List"><List size={16} /></button>
              <button onClick={() => runCommand('insertOrderedList')} className="gdoc-btn" title="Numbered List"><ListOrdered size={16} /></button>
            </div>

            <div className="gdoc-tool-group" style={{ marginLeft: 'auto' }}>
              <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }} disabled={loading}>
                <Save size={14} /> Save to Database
              </button>
              <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}>
                <Printer size={14} /> Print / Export
              </button>
              <button onClick={handleDelete} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem', background: '#e07979' }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          {/* Docs Workspace Page */}
          <div className="gdoc-editor-workspace">
            <div 
              ref={editorRef}
              className="gdoc-page"
              contentEditable={true}
              suppressContentEditableWarning={true}
              onInput={(e) => setDocumentContent(e.currentTarget.innerHTML)}
            ></div>
          </div>

          {/* Docs status bar */}
          <div className="gdoc-status-bar">
            <span>Status: <strong>{saveStatus}</strong></span>
            <span>Document Width: 800px (A4 page template)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
