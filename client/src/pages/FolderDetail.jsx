import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Phone, IndianRupee, Plus, CheckCircle, Database, Search, Download, Edit, Trash2, Settings, Cloud, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '../api';
import { offlineDB, db } from '../db';
import { toTamil } from '../utils/transliteration';

const FolderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation();
    const folderName = state?.folderName || 'Collection';
    const serverId = state?.serverId;

    const [entries, setEntries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        place: '',
        mobile: '',
        amount: '',
        paymentMode: 'Cash'
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [language, setLanguage] = useState('en'); // 'en' or 'ta'

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Refs for sequential focus
    const nameRef = useRef(null);
    const placeRef = useRef(null);
    const mobileRef = useRef(null);
    const amountRef = useRef(null);
    const paymentModeRef = useRef(null);

    useEffect(() => {
        loadEntries();
        if (nameRef.current) nameRef.current.focus();
    }, [id]);

    const loadEntries = async () => {
        if (navigator.onLine && serverId) {
            try {
                // SERVER-FIRST: When online, load directly from server
                const response = await apiFetch(`/folders/${serverId}/entries`);
                if (response.ok) {
                    const cloudEntries = await response.json();
                    setEntries(cloudEntries.map(e => ({
                        ...e,
                        id: e.id || e._id,
                        serverId: e.id || e._id,
                        paymentMode: e.paymentMode || 'Cash',
                        isSynced: 1
                    })));
                    return;
                }
            } catch (err) {
                console.warn('Server fetch failed, falling back to local:', err);
            }
        }
        
        // Offline fallback: try to load from local IndexedDB
        const numericId = parseInt(id);
        let localEntries = await offlineDB.getEntriesByFolder(numericId || id);
        if (localEntries.length === 0 && serverId) {
            localEntries = await offlineDB.getEntriesByFolder(serverId);
        }
        if (localEntries.length === 0 && id !== String(numericId)) {
            localEntries = await offlineDB.getEntriesByFolder(id);
        }
        setEntries(localEntries);
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
                handleInitiateSubmit(e);
            }
        }
    };

    const handleInitiateSubmit = (e) => {
        if (e) e.preventDefault();
        
        if (!formData.name || !formData.place || !formData.amount) {
            alert('Name, Place, and Amount are required fields.');
            return;
        }

        if (formData.paymentMode === 'UPI' && !editingId && !showQRModal) {
            setShowQRModal(true);
        } else {
            executeSubmit();
        }
    };

    const executeSubmit = async () => {
        setLoading(true);
        setShowQRModal(false);

        try {
            if (editingId) {
                // Edit existing
                await offlineDB.updateEntry(editingId, { ...formData, isSynced: 0 });
                setEditingId(null);
                setFormData({ name: '', place: '', mobile: '', amount: '', paymentMode: 'Cash' });
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
                await loadEntries();

                if (navigator.onLine) {
                    const entry = (await offlineDB.getEntriesByFolder(id)).find(e => e.id === editingId);
                    const targetId = entry.serverId || editingId;
                    await apiFetch(`/entries/${targetId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ ...formData, folder_id: serverId || id })
                    });
                    await offlineDB.markEntrySynced(editingId);
                }
                if (nameRef.current) nameRef.current.focus();
            } else {
                // Create new
                const numId = parseInt(id);
                const localId = await offlineDB.addEntry({ 
                    ...formData, 
                    folder_id: numId || id, 
                    isSynced: 0 
                });
                
                const newEntry = { id: localId, ...formData, isSynced: 0, createdAt: new Date() };
                setEntries(prev => [newEntry, ...prev]);
                setFormData({ name: '', place: '', mobile: '', amount: '', paymentMode: 'Cash' });
                setCurrentPage(1); // Reset to first page
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
                
                handlePrintReceipt(newEntry, entries.length + 1);

                if (navigator.onLine) {
                    try {
                        const response = await apiFetch('/entries', {
                            method: 'POST',
                            body: JSON.stringify({ ...formData, folder_id: serverId || id })
                        });
                        if (response.ok) {
                            const result = await response.json();
                            await offlineDB.updateEntry(localId, { isSynced: 1, serverId: result.id });
                            // Update UI state immediately to show "Synced"
                            setEntries(prev => prev.map(e => 
                                e.id === localId ? { ...e, isSynced: 1, serverId: result.id } : e
                            ));
                        }
                    } catch (e) { console.log('Sync postponed (Offline)'); }
                }
                if (nameRef.current) nameRef.current.focus();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (entry) => {
        setFormData({ 
            name: entry.name, 
            place: entry.place || '', 
            mobile: entry.mobile || '', 
            amount: entry.amount,
            paymentMode: entry.paymentMode || 'Cash'
        });
        setEditingId(entry.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (nameRef.current) nameRef.current.focus();
    };

    const handleDelete = async (entryId) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            const entry = entries.find(e => e.id === entryId);
            await offlineDB.deleteEntry(entryId);
            await loadEntries();

            if (navigator.onLine) {
                const targetId = entry.serverId || entryId;
                await apiFetch(`/entries/${targetId}`, { method: 'DELETE' });
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
                <title>Moi Master Receipt - ${entry.name}</title>
                <style>
                    @page { margin: 0; size: 58mm auto; }
                    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
                    body { font-family: 'Arial', sans-serif; width: 54mm; margin: 0 auto; padding: 3mm; color: #000; background: #fff; }
                    .header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; }
                    .header h2 { margin: 0; font-size: 15px; text-transform: uppercase; word-wrap: break-word; }
                    .header p { margin: 2px 0 0; font-size: 11px; font-weight: bold; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 1.5mm; font-size: 12px; line-height: 1.2; }
                    .info-label { font-weight: bold; flex: 0 0 20mm; }
                    .info-value { text-align: right; flex: 1; word-wrap: break-word; padding-left: 2mm; }
                    .amount-section { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3mm 0; margin: 3mm 0; text-align: center; }
                    .amount-label { font-size: 12px; margin-bottom: 1mm; font-weight: bold; }
                    .amount-value { font-size: 22px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 4mm; font-size: 11px; }
                    .footer p { margin: 2px 0; font-weight: bold; }
                    .tamil-font { font-family: 'Arial', sans-serif; }
                    @media print { body { width: 54mm; margin: 0; padding: 2mm; } }
                </style>
            </head>
            <body class="${language === 'ta' ? 'tamil-font' : ''}">
                <div class="header">
                    <h2>${language === 'ta' ? toTamil(folderName) : folderName}</h2>
                    <p>${language === 'ta' ? 'மொய் ரசீது' : 'மொய் ரசீது (Moi Receipt)'}</p>
                </div>
                <div class="info-row"><span class="info-label">${language === 'ta' ? 'வரிசை எண்:' : 'வரிசை எண்:'}</span><span class="info-value">#${sequentialNo}</span></div>
                <div class="info-row"><span class="info-label">${language === 'ta' ? 'தேதி:' : 'தேதி:'}</span><span class="info-value">${currentDate}</span></div>
                <div style="border-bottom: 1px solid #eee; margin: 2mm 0;"></div>
                <div class="info-row" style="margin-top: 2mm;"><span class="info-label">${language === 'ta' ? 'பெயர்:' : 'பெயர்:'}</span><span class="info-value" style="font-weight: bold; font-size: 16px;">${language === 'ta' ? toTamil(entry.name) : entry.name}</span></div>
                <div class="info-row"><span class="info-label">${language === 'ta' ? 'ஊர்:' : 'ஊர்:'}</span><span class="info-value">${language === 'ta' ? toTamil(entry.place || '-') : (entry.place || '-')}</span></div>
                ${entry.mobile ? `<div class="info-row"><span class="info-label">${language === 'ta' ? 'மொபைல்:' : 'மொபைல்:'}</span><span class="info-value">${entry.mobile}</span></div>` : ''}
                <div class="info-row"><span class="info-label">Payment Mode:</span><span class="info-value">${entry.paymentMode || 'Cash'}</span></div>
                <div class="amount-section"><div class="amount-label">${language === 'ta' ? 'வழங்கிய தொகை' : 'வழங்கிய தொகை (Amount)'}</div><div class="amount-value">₹${Number(entry.amount).toLocaleString('en-IN')}</div></div>
                <div class="footer"><p>${language === 'ta' ? 'மிக்க நன்றி!' : 'மிக்க நன்றி!'}</p><p>--- ${language === 'ta' ? 'நன்றி' : 'நன்றி'} ---</p></div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 500);
                    };
                    window.onafterprint = function() { window.close(); };
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
        const sourceEntries = filteredEntries.length > 0 ? filteredEntries : entries;
        if (sourceEntries.length === 0) return alert('No records to download');
        
        // REVERSE for Excel: Oldest first (Ascending)
        const printEntries = [...sourceEntries].reverse();
        
        let csvContent = "S.No,Name,Place,Mobile,Payment Mode,Amount\n";
        printEntries.forEach((entry, idx) => {
            const sno = idx + 1; // Simple increment for ascending order
            const name = `"${(language === 'ta' ? toTamil(entry.name) : entry.name).replace(/"/g, '""')}"`;
            const place = `"${(language === 'ta' ? toTamil(entry.place || '') : (entry.place || '')).replace(/"/g, '""')}"`;
            const mobile = `"${entry.mobile || ''}"`;
            const pMode = `"${entry.paymentMode || 'Cash'}"`;
            const amount = entry.amount;
            csvContent += `${sno},${name},${place},${mobile},${pMode},${amount}\n`;
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

    // Pagination calculations
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

    const totalCount = entries.length;
    const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

    const handlePrint = () => {
        const sourceEntries = filteredEntries.length > 0 ? filteredEntries : entries;
        if (sourceEntries.length === 0) return alert('No records found');

        // REVERSE for Print: Oldest first (Ascending)
        const printEntries = [...sourceEntries].reverse();
        
        const printPages = [];
        for (let i = 0; i < printEntries.length; i += 25) {
            printPages.push(printEntries.slice(i, i + 25));
        }

        const renderTable = (entriesOnPage) => `
            <table>
                <thead>
                    <tr>
                        <th style="width:50px;">#</th>
                        <th>${language === 'ta' ? 'பெயர்' : 'Name'}</th>
                        <th>${language === 'ta' ? 'ஊர்' : 'Place'}</th>
                        <th>${language === 'ta' ? 'மொபைல்' : 'Mobile'}</th>
                        <th>${language === 'ta' ? 'முறை' : 'P.Mode'}</th>
                        <th>${language === 'ta' ? 'தொகை' : 'Amount'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${entriesOnPage.map((entry, idx) => {
                        const pageBaseIdx = printPages.indexOf(entriesOnPage) * 25;
                        const sno = pageBaseIdx + idx + 1;
                        return `
                        <tr>
                            <td style="text-align:center;">${sno}</td>
                            <td style="font-weight:600;">${language === 'ta' ? toTamil(entry.name) : entry.name}</td>
                            <td>${language === 'ta' ? toTamil(entry.place || '-') : (entry.place || '-')}</td>
                            <td>${entry.mobile || '-'}</td>
                            <td>${entry.paymentMode || 'Cash'}</td>
                            <td style="font-weight:700; color:#333;">₹${Number(entry.amount).toLocaleString('en-IN')}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;

        const pagesHTML = printPages.map((pageEntries, pageIdx) => `
                <div class="print-page" style="${pageIdx > 0 ? 'page-break-before: always; margin-top: 30px;' : ''}">
                <div class="report-header">
                    <div class="report-title">${language === 'ta' ? 'மொய் விவரங்கள்' : 'Moi Master Records'}</div>
                    <div class="folder-name">${language === 'ta' ? toTamil(folderName) : folderName}</div>
                    <div class="page-info">${language === 'ta' ? `பக்கம் ${pageIdx + 1} / ${printPages.length}` : `Page ${pageIdx + 1} of ${printPages.length}`}</div>
                </div>
                <hr class="divider" />
                ${pageIdx === 0 ? `
                    <div class="stats-row">
                        <div class="stat-box">
                            <div class="label">${language === 'ta' ? 'மொத்த மொய்கள்' : 'Total Entries'}</div>
                            <div class="value">${totalCount}</div>
                        </div>
                        <div class="stat-box">
                            <div class="label">${language === 'ta' ? 'மொத்த தொகை' : 'Total Amount'}</div>
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
                <title>${folderName} - Moi Master Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; background: #fff; padding: 20px; }
                    .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; }
                    .report-title { font-size: 18pt; font-weight: bold; color: #000; }
                    .folder-name { font-size: 14pt; color: #444; }
                    .page-info { font-size: 10pt; color: #666; font-style: italic; }
                    .divider { border: none; border-top: 2px solid #000; margin-bottom: 15px; }
                    .stats-row { display: flex; gap: 15px; margin-bottom: 20px; }
                    .stat-box { flex: 1; border: 1.5px solid #000; border-radius: 4px; padding: 8px 12px; }
                    .stat-box .label { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 2px; }
                    .stat-box .value { font-size: 14pt; font-weight: bold; color: #000; }
                    table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
                    th { border: 1px solid #000; padding: 8px 10px; text-align: left; font-size: 9pt; background-color: #f0f0f0 !important; font-weight: bold; text-transform: uppercase; }
                    td { border: 1px solid #000; padding: 7px 10px; font-size: 10pt; color: #000; }
                    tr:nth-child(even) { background-color: #f9f9f9 !important; }
                    .footer { margin-top: 20px; text-align: center; font-size: 8pt; color: #888; }
                    @media print { 
                        body { padding: 0; } 
                        @page { margin: 1.5cm; size: A4 portrait; }
                        .print-page { page-break-after: always; }
                        .print-page:last-child { page-break-after: auto; }
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

    // Construct UPI format for QR Code
    // You can customize the UPI ID placeholder as needed
    const YOUR_UPI_ID = "placeholder@upi";
    const upiLink = `upi://pay?pa=${YOUR_UPI_ID}&pn=MoiMaster&am=${formData.amount}&cu=INR`;

    return (
        <div className="folder-detail-page page-transition">
            <header className="main-header">
                <button onClick={() => navigate('/')} className="back-btn">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="title-group">
                    <img src="/logo.png" alt="Logo" className="header-logo" />
                    <h1>{folderName}</h1>
                </div>
                <div style={{ width: 40 }}></div>
            </header>

            <main className="content">
                <section className="entry-form-card">
                    <h2>{editingId ? <Edit size={24} color="var(--primary)" /> : <Plus size={24} color="var(--primary)" />} {editingId ? 'Edit Entry' : 'New Entry'}</h2>
                    <form onSubmit={handleInitiateSubmit}>
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
                                    onKeyDown={(e) => handleKeyDown(e, paymentModeRef)}
                                    placeholder="0.00"
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label><Database size={14} /> Payment Mode</label>
                                <select 
                                    ref={paymentModeRef}
                                    name="paymentMode" 
                                    value={formData.paymentMode} 
                                    onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, null)}
                                    className="form-select"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI Scanner</option>
                                </select>
                            </div>

                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                            <button type="submit" disabled={loading} className="primary-btn">
                                {loading ? 'Saving...' : (editingId ? 'Update' : (formData.paymentMode === 'UPI' ? 'Scan & Pay' : 'Add Record'))}
                            </button>
                            {editingId && (
                                <button type="button" className="print-btn" onClick={() => { setEditingId(null); setFormData({ name: '', place: '', mobile: '', amount: '', paymentMode: 'Cash' }); }}>
                                    Cancel
                                </button>
                            )}
                            {success && <p className="success-inline"><CheckCircle size={16} /> Saved locally!</p>}
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
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
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
                    <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Database size={20} color="var(--text-muted)" /> {language === 'ta' ? 'கலெக்ஷன் பதிவுகள்' : 'Collection Records'} ({filteredEntries.length})
                        </h2>
                        <div 
                            className="lang-toggle-btn" 
                            onClick={() => setLanguage(l => l === 'en' ? 'ta' : 'en')}
                        >
                            <Settings size={18} />
                            <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
                        </div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{language === 'ta' ? 'பெயர்' : 'Name'}</th>
                                    <th>{language === 'ta' ? 'ஊர்' : 'Place'}</th>
                                    <th>{language === 'ta' ? 'மொபைல்' : 'Mobile'}</th>
                                    <th>{language === 'ta' ? 'முறை' : 'Mode'}</th>
                                    <th>{language === 'ta' ? 'தொகை' : 'Amount'}</th>
                                    <th style={{ textAlign: 'center' }}>{language === 'ta' ? 'நிலை' : 'Sync'}</th>
                                    <th style={{ textAlign: 'center' }}>{language === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="no-data-cell">
                                            {searchTerm ? 'No results found for your search.' : 'No records found for this collection.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedEntries.map((entry, index) => {
                                        // O(1) S.No calculation derived safely without searching arrays
                                        const globalIndex = ((currentPage - 1) * itemsPerPage) + index;
                                        const originalSequenceNum = filteredEntries.length - globalIndex;
                                        
                                        return (
                                        <tr key={entry.id}>
                                            <td style={{ color: 'var(--text-muted)', width: '50px' }}>{originalSequenceNum}</td>
                                            <td style={{ fontWeight: 600 }}>{language === 'ta' ? toTamil(entry.name) : entry.name}</td>
                                            <td>{language === 'ta' ? toTamil(entry.place || '-') : (entry.place || '-')}</td>
                                            <td>{entry.mobile || '-'}</td>
                                            <td><span className="badge-mode">{entry.paymentMode || 'Cash'}</span></td>
                                            <td className="amount-cell">₹{entry.amount}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: entry.isSynced ? 'var(--success)' : '#fbbf24' }}>
                                                    {entry.isSynced ? (language === 'ta' ? 'சேர்க்கப்பட்டது' : 'Synced') : (language === 'ta' ? 'காத்திருக்கவும்' : 'Wait...')}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                                    <button onClick={() => handleEdit(entry)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} title="Edit"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="print-btn"
                        >
                            Previous
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="print-btn"
                        >
                            Next
                        </button>
                    </div>
                )}
            </main>

            {/* UPI QR SCANNER MODAL */}
            {showQRModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', borderRadius: '50%', background: '#f3e8ff', color: '#9333ea', marginBottom: '1rem' }}>
                            <QrCode size={28} />
                        </div>
                        <h2 style={{ marginBottom: '1rem' }}>Scan to Pay</h2>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                            <QRCodeSVG value={upiLink} size={220} />
                        </div>
                        <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)' }}>Amount: ₹{formData.amount}</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>UPI Payment to MoiMaster</p>
                            <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '10px' }}>Wait for the person to successfully scan and complete payment.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setShowQRModal(false)} 
                                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={executeSubmit}
                                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderDetail;
