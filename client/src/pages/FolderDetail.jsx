import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Phone, IndianRupee, Plus, CheckCircle, Database, Search } from 'lucide-react';
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

    // Refs for sequential focus
    const nameRef = useRef(null);
    const placeRef = useRef(null);
    const mobileRef = useRef(null);
    const amountRef = useRef(null);

    useEffect(() => {
        fetchEntries();
        // Focus first field on mount
        if (nameRef.current) nameRef.current.focus();
    }, [id]);

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
            const response = await apiFetch('/entries', {
                method: 'POST',
                body: JSON.stringify({ ...formData, folder_id: id })
            });

            if (response.ok) {
                setFormData({ name: '', place: '', mobile: '', amount: '' });
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
                fetchEntries();
                // Focus back to name for next entry
                if (nameRef.current) nameRef.current.focus();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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
        
        const tableRows = printEntries.map((entry, index) => `
            <tr>
                <td style="text-align:center;">${entries.length - entries.indexOf(entry)}</td>
                <td style="font-weight:600;">${entry.name}</td>
                <td>${entry.place || '-'}</td>
                <td>${entry.mobile || '-'}</td>
                <td style="font-weight:700; color:#333;">₹${Number(entry.amount).toLocaleString('en-IN')}</td>
            </tr>
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
                        padding: 30px;
                    }
                    .report-title {
                        text-align: center;
                        font-size: 22pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #000;
                    }
                    .folder-name {
                        text-align: center;
                        font-size: 14pt;
                        color: #444;
                        margin-bottom: 20px;
                    }
                    .divider {
                        border: none;
                        border-top: 3px solid #000;
                        margin-bottom: 20px;
                    }
                    .stats-row {
                        display: flex;
                        gap: 20px;
                        margin-bottom: 25px;
                    }
                    .stat-box {
                        flex: 1;
                        border: 2px solid #000;
                        border-radius: 6px;
                        padding: 12px 16px;
                    }
                    .stat-box .label {
                        font-size: 10pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        color: #555;
                        margin-bottom: 4px;
                    }
                    .stat-box .value {
                        font-size: 16pt;
                        font-weight: bold;
                        color: #000;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 2px solid #000;
                    }
                    th {
                        background-color: #f0f0f0;
                        border: 1px solid #000;
                        padding: 10px 14px;
                        text-align: left;
                        font-size: 10pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    td {
                        border: 1px solid #000;
                        padding: 9px 14px;
                        font-size: 11pt;
                        color: #000;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .no-data {
                        text-align: center;
                        padding: 40px;
                        color: #666;
                        font-size: 12pt;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 9pt;
                        color: #888;
                    }
                    @media print {
                        body { padding: 15px; }
                        @page { margin: 1cm; size: A4 portrait; }
                    }
                </style>
            </head>
            <body>
                <div class="report-title">Moi Collection Records Report</div>
                <div class="folder-name">${folderName}</div>
                <hr class="divider" />
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
                ${printEntries.length > 0 ? `
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
                            ${tableRows}
                        </tbody>
                    </table>
                ` : `<div class="no-data">No records found for this collection.</div>`}
                <div class="footer">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(printHTML);
            printWindow.document.close();
            // Wait for content to fully render before triggering print
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
            };
            // Fallback in case onload doesn't fire (some browsers)
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
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
                    <h2><Plus size={24} color="var(--primary)" /> New Entry</h2>
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
                                {loading ? 'Saving...' : 'Finish'}
                            </button>
                            {success && <p className="success-inline"><CheckCircle size={16} /> Entry added successfully!</p>}
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
                    <button onClick={handlePrint} className="print-btn">
                        Print Records
                    </button>
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
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="no-data-cell">
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
