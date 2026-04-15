import React, { memo } from 'react';
import { User, MapPin, Phone, IndianRupee, Plus, CheckCircle, Database, Search, Download, Edit, Trash2, Settings, Cloud, QrCode, Loader2, LogOut, Printer } from 'lucide-react';
import LoadingButton from './LoadingButton';

// 1. Stats Cards Component (Isolated from form re-renders)
export const StatsOverview = memo(({ stats }) => {
    console.log('[DEBUG] [RENDER]: StatsOverview');
    return (
        <div className="stats-container">
            <div className="stat-card">
                <div className="stat-label">
                    <User size={16} /> Total Entries
                </div>
                <div className="stat-value">{stats.count}</div>
            </div>
            <div className="stat-card">
                <div className="stat-label">
                    <IndianRupee size={16} /> Total Amount
                </div>
                <div className="stat-value highlight">₹{stats.total.toLocaleString()}</div>
            </div>
        </div>
    );
});

// 2. Entry Form Component (Isolated state)
export const EntryForm = ({ 
    formData, 
    handleChange, 
    handleInitiateSubmit, 
    loading, 
    success, 
    editingId,
    setEditingId,
    setFormData,
    nameRef,
    placeRef,
    mobileRef,
    amountRef,
    paymentModeRef,
    handleKeyDown
}) => {
    console.log('[DEBUG] [RENDER]: EntryForm');
    return (
        <section className="entry-form-card">
            <h2>
                {editingId ? <Edit size={24} color="var(--primary)" /> : <Plus size={24} color="var(--primary)" />} 
                {editingId ? 'Edit Entry' : 'New Entry'}
            </h2>
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
                    <LoadingButton type="submit" loading={loading}>
                        {editingId ? 'Update' : (formData.paymentMode === 'UPI' ? 'Scan & Pay' : 'Add Record')}
                    </LoadingButton>
                    {editingId && (
                        <button type="button" className="print-btn" onClick={() => { 
                            setEditingId(null); 
                            setFormData({ name: '', place: '', mobile: '', amount: '', paymentMode: 'Cash' }); 
                        }}>
                            Cancel
                        </button>
                    )}
                    {success && <p className="success-inline"><CheckCircle size={16} /> Saved locally!</p>}
                </div>
            </form>
        </section>
    );
};

// 3. Entry Table Component (Isolated and memoized)
export const EntryTable = memo(({ 
    displayEntries, 
    language, 
    toTamil, 
    isClientView, 
    handleEdit, 
    handleDelete,
    currentPage,
    itemsPerPage,
    totalCount,
    searchTerm
}) => {
    console.log('[DEBUG] [RENDER]: EntryTable');
    return (
        <section className="table-section">
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
                            {!isClientView && <th style={{ textAlign: 'center' }}>{language === 'ta' ? 'செயல்கள்' : 'Actions'}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayEntries.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data-cell">
                                    {searchTerm ? 'No results found.' : 'No records found.'}
                                </td>
                            </tr>
                        ) : (
                            displayEntries.map((entry, index) => {
                                const globalIndex = ((currentPage - 1) * itemsPerPage) + index;
                                const originalSequenceNum = totalCount - globalIndex;
                                
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
                                            {entry.isSynced ? (language === 'ta' ? 'Synced' : 'Synced') : (language === 'ta' ? 'Wait...' : 'Wait...')}
                                        </span>
                                    </td>
                                    {!isClientView && (
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                                <button onClick={() => handleEdit(entry)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
});
