import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Phone, IndianRupee, Plus, CheckCircle, Database, Search, Download, Edit, Trash2, Settings } from 'lucide-react';
import { apiFetch } from '../api';

const FolderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation();
    const folderName = state?.folderName || 'Collection';

    const [entries, setEntries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        place: '',
        mobile: '',
        amount: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Refs for sequential focus
    const nameRef = useRef(null);
    const placeRef = useRef(null);
    const mobileRef = useRef(null);
    const amountRef = useRef(null);

    useEffect(() => {
        fetchFolder();
        fetchEntries();
        // Focus first field on mount
        if (nameRef.current) nameRef.current.focus();
    }, [id]);

    const fetchFolder = async () => {
        try {
            const response = await apiFetch(`/folders`);
            const data = await response.json();
        } catch (err) {
            console.error('Error fetching folder:', err);
        }
    };

    const fetchEntries = async () => {
        const response = await apiFetch(`/folders/${id}/entries`);
        const data = await response.json();
        setEntries(data);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            } else {
                // Last field (Amount), submit form
                handleSubmit(e);
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!formData.name || !formData.place || !formData.amount) {
            alert('Name, Place, and Amount are required fields.');
            return;
        }

        if (formData.mobile) {
            const mobileStr = formData.mobile.trim().replace(/\s+/g, '');
            const mobileRegex = /^(?:\+91)?[0-9]{10}$/;
            if (!mobileRegex.test(mobileStr)) {
                alert('Please enter a valid 10-digit mobile number, or an Indian number with +91.');
                return;
            }
        }
        
        setLoading(true);

        try {
            if (editingId) {
                const response = await apiFetch(`/entries/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...formData, folder_id: id })
                });
                if (response.ok) {
                    setFormData({ name: '', place: '', mobile: '', amount: '' });
                    setEditingId(null);
                    setSuccess(true);
                    setTimeout(() => setSuccess(false), 3000);
                    fetchEntries();
                    if (nameRef.current) nameRef.current.focus();
                }
            } else {
                const response = await apiFetch('/entries', {
                    method: 'POST',
                    body: JSON.stringify({ ...formData, folder_id: id })
                });

                if (response.ok) {
                    const savedEntry = await response.json();
                    setFormData({ name: '', place: '', mobile: '', amount: '' });
                    setSuccess(true);
                    setTimeout(() => setSuccess(false), 3000);
                    
                    // Optimistic update: Add to local state immediately instead of waiting for full list fetch
                    setEntries(prev => [savedEntry, ...prev]);
                    
                    // Trigger Single Receipt Bill
                    handlePrintReceipt(savedEntry, entries.length + 1);
                    
                    if (nameRef.current) nameRef.current.focus();
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleEdit = (entry) => {
        setFormData({ name: entry.name, place: entry.place || '', mobile: entry.mobile || '', amount: entry.amount });
        setEditingId(entry.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (nameRef.current) nameRef.current.focus();
    };

    const handleDelete = async (entryId) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            const response = await apiFetch(`/entries/${entryId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchEntries();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePrintReceipt = (entry, sequentialNo) => {
        const currentDate = new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Moi Receipt - ${entry.name}</title>
                <style>
                    @page {
                        margin: 0;
                        size: 58mm auto;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact;
                    }
                    body {
                        font-family: 'Arial', sans-serif;
                        width: 54mm;
                        margin: 0 auto;
                        padding: 3mm;
                        color: #000;
                        background: #fff;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 1.5px solid #000;
                        padding-bottom: 2mm;
                        margin-bottom: 2mm;
                    }
                    .header h2 {
                        margin: 0;
                        font-size: 15px;
                        text-transform: uppercase;
                        word-wrap: break-word;
                    }
                    .header p {
                        margin: 2px 0 0;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 1.5mm;
                        font-size: 12px;
                        line-height: 1.2;
                    }
                    .info-label {
                        font-weight: bold;
                        flex: 0 0 20mm;
                    }
                    .info-value {
                        text-align: right;
                        flex: 1;
                        word-wrap: break-word;
                        padding-left: 2mm;
                    }
                    .amount-section {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        padding: 3mm 0;
                        margin: 3mm 0;
                        text-align: center;
                    }
                    .amount-label {
                        font-size: 12px;
                        margin-bottom: 1mm;
                        font-weight: bold;
                    }
                    .amount-value {
                        font-size: 22px;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 4mm;
                        font-size: 11px;
                    }
                    .footer p {
                        margin: 2px 0;
                        font-weight: bold;
                    }
                    @media print {
                        body { width: 54mm; margin: 0; padding: 2mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${folderName}</h2>
                    <p>மொய் ரசீது (Moi Receipt)</p>
                </div>
                
                <div class="info-row">
                    <span class="info-label">வரிசை எண்:</span>
                    <span class="info-value">#${sequentialNo}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">தேதி:</span>
                    <span class="info-value">${currentDate}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; margin: 2mm 0;"></div>
                <div class="info-row" style="margin-top: 2mm;">
                    <span class="info-label">பெயர்:</span>
                    <span class="info-value" style="font-weight: bold; font-size: 16px;">${entry.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ஊர்:</span>
                    <span class="info-value">${entry.place || '-'}</span>
                </div>
                ${entry.mobile ? `
                <div class="info-row">
                    <span class="info-label">மொபைல்:</span>
                    <span class="info-value">${entry.mobile}</span>
                </div>
                ` : ''}

                <div class="amount-section">
                    <div class="amount-label">வழங்கிய தொகை (Amount)</div>
                    <div class="amount-value">₹${Number(entry.amount).toLocaleString('en-IN')}</div>
                </div>

                <div class="footer">
                    <p>மிக்க நன்றி!</p>
                    <p>--- நன்றி ---</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            // In some browsers, window.close() might be blocked if not triggered by script
                            // but for a dedicated print window it usually works after print
                        }, 500);
                    };
                    window.onafterprint = function() {
                        window.close();
                    };
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(receiptHTML);
            printWindow.document.close();
        }
    };

    const handleDownloadExcel = () => {
        const printEntries = filteredEntries.length > 0 ? filteredEntries : entries;
        if (printEntries.length === 0) return alert('No records to download');
        
        let csvContent = "S.No,Name,Place,Mobile,Amount\n";
        printEntries.forEach((entry) => {
            const sno = entries.length - entries.indexOf(entry);
            const name = `"${entry.name.replace(/"/g, '""')}"`;
            const place = `"${(entry.place || '').replace(/"/g, '""')}"`;
            const mobile = `"${entry.mobile || ''}"`;
            const amount = entry.amount;
            csvContent += `${sno},${name},${place},${mobile},${amount}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${folderName}_Collection.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredEntries = entries.filter(entry => {
        const term = searchTerm.toLowerCase();
        return (
            entry.name.toLowerCase().includes(term) ||
            (entry.place && entry.place.toLowerCase().includes(term)) ||
            (entry.mobile && entry.mobile.toString().includes(term))
        );
    });

    const totalCount = entries.length;
    const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

    const handlePrint = () => {
        // Build a clean HTML document with all the data for reliable printing
        const printEntries = filteredEntries.length > 0 ? filteredEntries : entries;
        
        // Split entries into pages (25 per page)
        const entriesPerPage = 25;
        const pages = [];
        for (let i = 0; i < printEntries.length; i += entriesPerPage) {
            pages.push(printEntries.slice(i, i + entriesPerPage));
        }

        const renderTable = (entriesOnPage) => `
            <table>
                <thead>
                    <tr>
                        <th style="width:50px;">#</th>
                        <th>Name</th>
                        <th>Place</th>
                        <th>Mobile</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${entriesOnPage.map((entry) => `
                        <tr>
                            <td style="text-align:center;">${entries.length - entries.indexOf(entry)}</td>
                            <td style="font-weight:600;">${entry.name}</td>
                            <td>${entry.place || '-'}</td>
                            <td>${entry.mobile || '-'}</td>
                            <td style="font-weight:700; color:#333;">₹${Number(entry.amount).toLocaleString('en-IN')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const pagesHTML = pages.map((pageEntries, pageIdx) => `
            <div class="print-page" style="${pageIdx > 0 ? 'page-break-before: always; margin-top: 30px;' : ''}">
                <div class="report-header">
                    <div class="report-title">Moi Collection Records</div>
                    <div class="folder-name">${folderName}</div>
                    <div class="page-info">Page ${pageIdx + 1} of ${pages.length}</div>
                </div>
                <hr class="divider" />
                ${pageIdx === 0 ? `
                    <div class="stats-row">
                        <div class="stat-box">
                            <div class="label">Total Entries</div>
                            <div class="value">${totalCount}</div>
                        </div>
                        <div class="stat-box">
                            <div class="label">Total Amount</div>
                            <div class="value">₹${totalAmount.toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                ` : ''}
                ${renderTable(pageEntries)}
                <div class="footer">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</div>
            </div>
        `).join('');

        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${folderName} - Moi Collection Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        color: #000;
                        background: #fff;
                        padding: 20px;
                    }
                    .report-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        margin-bottom: 5px;
                    }
                    .report-title {
                        font-size: 18pt;
                        font-weight: bold;
                        color: #000;
                    }
                    .folder-name {
                        font-size: 14pt;
                        color: #444;
                    }
                    .page-info {
                        font-size: 10pt;
                        color: #666;
                        font-style: italic;
                    }
                    .divider {
                        border: none;
                        border-top: 2px solid #000;
                        margin-bottom: 15px;
                    }
                    .stats-row {
                        display: flex;
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    .stat-box {
                        flex: 1;
                        border: 1.5px solid #000;
                        border-radius: 4px;
                        padding: 8px 12px;
                    }
                    .stat-box .label {
                        font-size: 9pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        color: #555;
                        margin-bottom: 2px;
                    }
                    .stat-box .value {
                        font-size: 14pt;
                        font-weight: bold;
                        color: #000;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 1.5px solid #000;
                    }
                    th {
                        background-color: #f0f0f0 !important;
                        border: 1px solid #000;
                        padding: 8px 10px;
                        text-align: left;
                        font-size: 9pt;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    td {
                        border: 1px solid #000;
                        padding: 7px 10px;
                        font-size: 10pt;
                        color: #000;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9 !important;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 8pt;
                        color: #888;
                    }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 1.5cm; size: A4 portrait; }
                        .print-page { page-break-after: always; }
                        .print-page:last-child { page-break-after: auto; }
                        tr { page-break-inside: avoid; }
                        thead { display: table-header-group; }
                    }
                </style>
            </head>
            <body>
                ${printEntries.length > 0 ? pagesHTML : '<div class="no-data" style="text-align:center; padding:40px;">No records found for this collection.</div>'}
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (printWindow) {
            printWindow.document.write(printHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
            };
            setTimeout(() => {
                if (printWindow) {
                    printWindow.focus();
                    printWindow.print();
                }
            }, 1000);
        }
    };

    return (
        <div className="folder-detail-page">
            <header className="main-header">
                <button onClick={() => navigate('/')} className="back-btn">
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <h1>{folderName}</h1>
                <div style={{ width: 40 }}></div>
            </header>

            <main className="content">
                <section className="entry-form-card">
                    <h2>{editingId ? <Edit size={24} color="var(--primary)" /> : <Plus size={24} color="var(--primary)" />} {editingId ? 'Edit Entry' : 'New Entry'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label><User size={14} /> Name</label>
                                <input 
                                    ref={nameRef}
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, placeRef)}
                                    placeholder="Full Name"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label><MapPin size={14} /> Place</label>
                                <input 
                                    ref={placeRef}
                                    name="place" 
                                    value={formData.place} 
                                    onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, mobileRef)}
                                    placeholder="City/Village"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label><Phone size={14} /> Mobile</label>
                                <input 
                                    ref={mobileRef}
                                    name="mobile" 
                                    value={formData.mobile} 
                                    onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, amountRef)}
                                    placeholder="Phone Number"
                                />
                            </div>
                            <div className="form-group">
                                <label><IndianRupee size={14} /> Amount</label>
                                <input 
                                    ref={amountRef}
                                    type="number"
                                    name="amount" 
                                    value={formData.amount} 
                                    onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, null)}
                                    placeholder="0.00"
                                    required 
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <button type="submit" disabled={loading} className="primary-btn">
                                {loading ? 'Saving...' : (editingId ? 'Update' : 'Finish')}
                            </button>
                            {editingId && (
                                <button type="button" className="print-btn" onClick={() => { setEditingId(null); setFormData({ name: '', place: '', mobile: '', amount: '' }); }}>
                                    Cancel
                                </button>
                            )}
                            {success && <p className="success-inline"><CheckCircle size={16} /> Saved successfully!</p>}
                        </div>
                    </form>
                </section>

                <div className="stats-container">
                    <div className="stat-card">
                        <span className="stat-label"><User size={14} /> Total Entries</span>
                        <span className="stat-value">{totalCount}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label"><IndianRupee size={14} /> Total Amount</span>
                        <span className="stat-value highlight">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="search-container">
                    <div className="search-bar">
                        <Search size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by Name, Place, or Mobile..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={handleDownloadExcel} className="print-btn" style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}>
                            <Download size={16} /> Excel Download
                        </button>
                        <button onClick={handlePrint} className="print-btn" style={{ backgroundColor: '#4f46e5', color: 'white', borderColor: '#4f46e5' }}>
                            Print Records
                        </button>
                    </div>
                </div>



                <section className="table-section">
                    <div className="table-header">
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Database size={20} color="var(--text-muted)" /> Collection Records ({filteredEntries.length})
                        </h2>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Place</th>
                                    <th>Mobile</th>
                                    <th>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="no-data-cell">
                                            {searchTerm ? 'No results found for your search.' : 'No records found for this collection.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEntries.map((entry, index) => (
                                        <tr key={entry.id}>
                                            <td style={{ color: 'var(--text-muted)', width: '50px' }}>{entries.length - entries.indexOf(entry)}</td>
                                            <td className="font-medium">{entry.name}</td>
                                            <td>{entry.place || '-'}</td>
                                            <td>{entry.mobile || '-'}</td>
                                            <td className="amount-cell">₹{entry.amount}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                                    <button onClick={() => handleEdit(entry)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} title="Edit"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default FolderDetail;
