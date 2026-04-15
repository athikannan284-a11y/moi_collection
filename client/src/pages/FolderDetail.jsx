import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut, Search, Download, Database, Settings, Printer, QrCode, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api';
import { offlineDB } from '../db';
import { toTamil } from '../utils/transliteration';
import html2pdf from 'html2pdf.js';
import Toast from '../components/Toast';
import LoadingButton from '../components/LoadingButton';
import { StatsOverview, EntryForm, EntryTable } from '../components/FolderDetailComponents';

const FolderDetail = ({ isSyncing, pendingCount, setClientAuth, clientFolderId, isAdmin }) => {
    console.log('[DEBUG] [RENDER]: FolderDetail (Main Container)');
    const { id } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation();
    const folderName = state?.folderName || 'Collection';
    const serverId = state?.serverId;

    const isClientView = Boolean(clientFolderId && !isAdmin);

    useEffect(() => {
        if (isClientView && clientFolderId !== id && clientFolderId !== serverId) {
            navigate('/login');
        }
    }, [id, clientFolderId, serverId, isClientView, navigate]);

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
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [toast, setToast] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastSubmitRef = useRef(null);
    const submitLockRef = useRef(false);

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
        
        if (submitLockRef.current) {
            console.log('[DEBUG] [LOCK]: Blocked duplicate click (Hard-Lock active)');
            return;
        }

        const amountNum = Number(formData.amount);
        if (!formData.name || !formData.place || isNaN(amountNum) || amountNum <= 0) {
            setToast({ message: 'Please enter valid Name, Place, and Amount.', type: 'error' });
            return;
        }

        if (formData.mobile && !/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
            setToast({ message: 'Please enter a valid 10-digit mobile number.', type: 'error' });
            return;
        }

        // Prevent Duplicate Detection (same data within 10 seconds)
        const currentData = JSON.stringify({ ...formData, folder_id: id });
        const now = Date.now();
        if (lastSubmitRef.current && lastSubmitRef.current.data === currentData && (now - lastSubmitRef.current.time < 10000)) {
            setToast({ message: 'Duplicate entry detected. Please wait a few seconds.', type: 'info' });
            return;
        }

        if (formData.paymentMode === 'UPI' && !editingId && !showQRModal) {
            setShowQRModal(true);
        } else {
            executeSubmit();
        }
    };

    const executeSubmit = async () => {
        submitLockRef.current = true;
        setIsSubmitting(true);
        setLoading(true);
        setShowQRModal(false);

        console.log('[DEBUG] [SAVE]: Initiating entry save...');
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
            
            // Record last submit to prevent duplicates
            lastSubmitRef.current = {
                data: JSON.stringify({ ...formData, folder_id: id }),
                time: Date.now()
            };

            setToast({ message: editingId ? 'Entry updated successfully!' : 'Entry added successfully!', type: 'success' });
            console.log(`[DEBUG] [SAVE]: API Success. Entries count at save: ${entries.length + (editingId ? 0 : 1)}`);

        } catch (err) {
            console.error(err);
            setToast({ message: 'Error saving entry. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
            setIsSubmitting(false);
            submitLockRef.current = false;
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
        try {
            console.log('[DEBUG] [EXPORT]: Generating Excel binary...');
            // Ensure data is mapped to plain objects with clean headers
            const dataToExport = entries.map((entry, index) => ({
                'S.No': index + 1,
                'Name': language === 'ta' ? toTamil(entry.name) : entry.name,
                'Place': language === 'ta' ? toTamil(entry.place || '') : entry.place || '-',
                'Mobile': entry.mobile || '-',
                'Amount': Number(entry.amount),
                'Mode': entry.paymentMode || 'Cash',
                'Date': new Date(entry.createdAt).toLocaleDateString()
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Moi Collection");
            
            // Set cell widths for better readability
            ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

            XLSX.writeFile(wb, `${folderName}_Moi_Collection.xlsx`);
            setToast({ message: 'Excel file downloaded successfully!', type: 'success' });
        } catch (err) {
            console.error('Excel Export Error:', err);
            setToast({ message: 'Failed to generate Excel file.', type: 'error' });
        } finally {
            setShowDownloadMenu(false);
        }
    };

    // --- Performance Optimization: Memoize Filtered Entries ---
    const filteredEntries = React.useMemo(() => {
        if (!searchTerm) return entries;
        const lowSearch = searchTerm.toLowerCase();
        return entries.filter(e => 
            e.name.toLowerCase().includes(lowSearch) || 
            (e.place && e.place.toLowerCase().includes(lowSearch))
        );
    }, [entries, searchTerm]);

    const displayEntries = React.useMemo(() => {
        const lastIndex = currentPage * itemsPerPage;
        const firstIndex = lastIndex - itemsPerPage;
        return filteredEntries.slice(firstIndex, lastIndex);
    }, [filteredEntries, currentPage]);

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

    // --- Memoize Stats to prevent heavy recalculation ---
    const stats = React.useMemo(() => {
        const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
        return { total, count: entries.length };
    }, [entries]);

    const handlePrint = () => {
        const sourceEntries = filteredEntries.length > 0 ? filteredEntries : entries;
        if (sourceEntries.length === 0) return alert('No records found');

        // NO REVERSE: Keep Ascending (Oldest first as requested)
        const printEntries = [...sourceEntries];
        
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
                            <div class="value">${stats.count}</div>
                        </div>
                        <div class="stat-box">
                            <div class="label">${language === 'ta' ? 'மொத்த தொகை' : 'Total Amount'}</div>
                            <div class="value">₹${stats.total.toLocaleString('en-IN')}</div>
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

    const handleDownloadPDF = async () => {
        try {
            console.log('[DEBUG] [EXPORT]: Generating paginated PDF...');
            setLoading(true);

            const sourceEntries = filteredEntries.length > 0 ? filteredEntries : entries;
            if (sourceEntries.length === 0) return alert('No records to export');

            // NO REVERSE: Keep Ascending (Oldest first as requested)
            const exportEntries = [...sourceEntries];
            const pages = [];
            const itemsPerPagePDF = 25;

            for (let i = 0; i < exportEntries.length; i += itemsPerPagePDF) {
                pages.push(exportEntries.slice(i, i + itemsPerPagePDF));
            }

            const renderTableHTML = (entriesOnPage, pageIdx) => `
                <table style="width:100%; border-collapse:collapse; margin-bottom:20px; border:1px solid #333;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="border:1px solid #333; padding:8px; text-align:left; width:40px;">#</th>
                            <th style="border:1px solid #333; padding:8px; text-align:left;">${language === 'ta' ? 'பெயர்' : 'Name'}</th>
                            <th style="border:1px solid #333; padding:8px; text-align:left;">${language === 'ta' ? 'ஊர்' : 'Place'}</th>
                            <th style="border:1px solid #333; padding:8px; text-align:left;">${language === 'ta' ? 'மொபைல்' : 'Mobile'}</th>
                            <th style="border:1px solid #333; padding:8px; text-align:right;">${language === 'ta' ? 'தொகை' : 'Amount'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entriesOnPage.map((e, idx) => `
                            <tr>
                                <td style="border:1px solid #333; padding:6px; font-size:10pt;">${(pageIdx * itemsPerPagePDF) + idx + 1}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:10pt; font-weight:600;">${language === 'ta' ? toTamil(e.name) : e.name}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:10pt;">${language === 'ta' ? toTamil(e.place || '-') : (e.place || '-')}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:10pt;">${e.mobile || '-'}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:10pt; text-align:right; font-weight:700;">₹${Number(e.amount).toLocaleString('en-IN')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px;">
                    ${pages.map((pageData, pIdx) => `
                        <div class="pdf-page" style="${pIdx > 0 ? 'page-break-before: always; padding-top: 40px;' : ''}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1e293b; padding-bottom:10px; margin-bottom:20px;">
                                <div>
                                    <h1 style="margin:0; font-size:22pt;">${language === 'ta' ? 'மொய் விவரங்கள்' : 'Moi Master Records'}</h1>
                                    <h2 style="margin:5px 0 0; font-size:16pt; color:#475569;">${language === 'ta' ? toTamil(folderName) : folderName}</h2>
                                </div>
                                <div style="text-align:right; font-size:10pt; font-style:italic;">
                                    Page ${pIdx + 1} of ${pages.length}
                                </div>
                            </div>
                            
                            ${pIdx === 0 ? `
                                <div style="display:flex; gap:15px; margin-bottom:20px;">
                                    <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:6px;">
                                        <div style="font-size:9pt; color:#64748b; text-transform:uppercase;">${language === 'ta' ? 'மொத்த மொய்கள்' : 'Total Entries'}</div>
                                        <div style="font-size:14pt; font-weight:bold;">${stats.count}</div>
                                    </div>
                                    <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:6px;">
                                        <div style="font-size:9pt; color:#64748b; text-transform:uppercase;">${language === 'ta' ? 'மொத்த தொகை' : 'Total Amount'}</div>
                                        <div style="font-size:14pt; font-weight:bold;">₹${stats.total.toLocaleString('en-IN')}</div>
                                    </div>
                                </div>
                            ` : ''}

                            ${renderTableHTML(pageData, pIdx)}
                            
                            <div style="text-align:center; font-size:8pt; color:#94a3b8; margin-top:10px;">
                                Generated via Moi Master Application on ${new Date().toLocaleDateString('en-IN')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            const opt = {
                margin: 0.2,
                filename: `${folderName}_Report.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(htmlContent).save();
            setToast({ message: 'PDF downloaded successfully!', type: 'success' });
        } catch (err) {
            console.error('PDF Export Error:', err);
            setToast({ message: 'Failed to generate PDF file.', type: 'error' });
        } finally {
            setLoading(false);
            setShowDownloadMenu(false);
        }
    };

    // Construct UPI format for QR Code
    // You can customize the UPI ID placeholder as needed
    const YOUR_UPI_ID = "placeholder@upi";
    const upiLink = `upi://pay?pa=${YOUR_UPI_ID}&pn=MoiMaster&am=${formData.amount}&cu=INR`;

    return (
        <div className="folder-detail-page page-transition">
            <header className="main-header">
                <div className="header-left">
                    {isClientView ? (
                        <button onClick={() => { setClientAuth(null); navigate('/login'); }} className="back-btn" style={{ marginRight: '1rem', color: '#ff4b4b' }}>
                            <LogOut size={18} /> Logout
                        </button>
                    ) : (
                        <button onClick={() => navigate('/')} className="back-btn" style={{ marginRight: '1rem' }}>
                            <ArrowLeft size={18} /> Back
                        </button>
                    )}
                    <div className="title-group">
                        <img src="/logo.png" alt="Logo" className="header-logo" />
                        <h1>{folderName}</h1>
                    </div>
                </div>
                <div className="header-spacer">{/* Grid Spacer */}</div>
                <div className="header-right">
                </div>
            </header>

            <main className="content">
                {!isClientView && (
                <EntryForm 
                    formData={formData}
                    handleChange={handleChange}
                    handleInitiateSubmit={handleInitiateSubmit}
                    loading={loading}
                    success={success}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    setFormData={setFormData}
                    nameRef={nameRef}
                    placeRef={placeRef}
                    mobileRef={mobileRef}
                    amountRef={amountRef}
                    paymentModeRef={paymentModeRef}
                    handleKeyDown={handleKeyDown}
                />
                )}

                <StatsOverview stats={stats} />

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
                    {!isClientView && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {/* Download Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setShowDownloadMenu(!showDownloadMenu)} 
                                    className="print-btn" 
                                    style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> Download
                                </button>
                                {showDownloadMenu && (
                                    <div style={{ 
                                        position: 'absolute', top: '100%', left: 0, marginTop: '8px', 
                                        background: 'var(--bg-card)', border: '1px solid var(--border)', 
                                        borderRadius: 'var(--radius-md)', padding: '8px', 
                                        display: 'flex', flexDirection: 'column', gap: '4px', 
                                        zIndex: 50, minWidth: '160px', boxShadow: 'var(--shadow)'
                                    }}>
                                        <button 
                                            onClick={() => { handleDownloadExcel(); setShowDownloadMenu(false); }} 
                                            style={{ background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', cursor: 'pointer', borderRadius: '6px' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <Database size={16} color="#10b981"/> Excel (.xlsx)
                                        </button>
                                        <button 
                                            onClick={() => { handleDownloadPDF(); setShowDownloadMenu(false); }} 
                                            style={{ background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', cursor: 'pointer', borderRadius: '6px' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <Download size={16} color="#ef4444"/> PDF (.pdf)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Print Button */}
                            <button 
                                onClick={handlePrint} 
                                className="print-btn" 
                                style={{ backgroundColor: '#4f46e5', color: 'white', borderColor: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Printer size={16} /> Print
                            </button>
                        </div>
                    )}
                </div>

                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
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

                <EntryTable 
                    displayEntries={displayEntries}
                    language={language}
                    toTamil={toTamil}
                    isClientView={isClientView}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    totalCount={filteredEntries.length}
                    searchTerm={searchTerm}
                />

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
                    <div className="qr-modal">
                        <h3><QrCode size={24} /> UPI Scanner</h3>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', display: 'inline-block', margin: '15px 0' }}>
                            <QRCodeSVG value={upiLink} size={200} />
                        </div>
                        <p style={{ fontWeight: 600 }}>Amount: ₹{formData.amount}</p>
                        <div className="qr-actions">
                            <button onClick={() => setShowQRModal(false)} className="print-btn">Cancel</button>
                            <LoadingButton onClick={executeSubmit} loading={loading}>
                                <CheckCircle size={18} /> Paid & Save
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        </div>
    );
};

export default FolderDetail;
