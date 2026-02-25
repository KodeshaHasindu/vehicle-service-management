import { useState, useEffect } from 'react';
import './index.css';

const API_URL = 'http://localhost:5000/api/services';
const API_PRICES_URL = 'http://localhost:5000/api/service-prices';

function App() {
  const [services, setServices] = useState([]);
  const [servicePrices, setServicePrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Admin Manage Service State
  const [newServicePrice, setNewServicePrice] = useState({ name: '', price: 0, category: 'Service' });

  /* Create Form State */
  const [formData, setFormData] = useState({
    vehicleName: '',
    vehicleNumber: '',
    ownerName: '',
    customerNumber: '',
    serviceType: [],
    notes: ''
  });

  /* Edit Form State */
  const [editingService, setEditingService] = useState(null); // The service being edited
  const [editFormData, setEditFormData] = useState(null); // Form data for the edit modal

  const [searchQuery, setSearchQuery] = useState('');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'billing'

  useEffect(() => {
    fetchServices();
    fetchServicePrices();
  }, []);

  const fetchServicePrices = async () => {
    try {
      const res = await fetch(API_PRICES_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setServicePrices(data);
      }
    } catch (err) {
      console.error('Error fetching service prices:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setServices(data);
      } else {
        console.error('API returned non-array:', data);
        setServices([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching services:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ vehicleName: '', vehicleNumber: '', ownerName: '', customerNumber: '', serviceType: [], notes: '' });
        fetchServices();
      } else {
        const errorData = await res.json();
        alert('Failed to create request: ' + errorData.message);
      }
    } catch (err) {
      console.error('Error adding service:', err);
      alert('Network error: ' + err.message);
    }
  };

  const handleEditClick = (service) => {
    setEditingService(service);
    const normalizedServiceType = Array.isArray(service.serviceType) 
      ? service.serviceType.map(item => {
          if (typeof item === 'string') {
              // Legacy string handling
              const sp = servicePrices.find(p => p.name === item);
              return { 
                  name: item, 
                  category: sp ? sp.category : 'Service', 
                  quantity: 1, 
                  unitPrice: sp ? sp.price : 0 
              };
          }
          return item;
      }) 
      : [];

    setEditFormData({
      vehicleName: service.vehicleName,
      vehicleNumber: service.vehicleNumber || '',
      ownerName: service.ownerName,
      customerNumber: service.customerNumber || '',
      serviceType: normalizedServiceType,
      notes: service.notes || ''
    });
  };

  const closeEditModal = () => {
    setEditingService(null);
    setEditFormData(null);
  };

  const handleUpdate = async (e) => {
      e.preventDefault();
      if (!editingService) return;

      try {
        const res = await fetch(`${API_URL}/${editingService._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editFormData)
        });

        if (res.ok) {
            closeEditModal();
            fetchServices();
        } else {
            const errorData = await res.json();
            alert('Failed to update: ' + errorData.message);
        }
      } catch (err) {
          console.error('Error updating:', err);
          alert('Network error: ' + err.message);
      }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchServices();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const deleteService = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
    }
  };

  /* Billing Logic */
  const [billingService, setBillingService] = useState(null);
  const [billingData, setBillingData] = useState({
      partsCost: 0,
      laborCost: 0,
      discount: 0,
      extraServiceCost: 0,
      extraServiceNotes: '',
      paymentStatus: 'Unpaid'
  });

  const handleBillClick = (service) => {
      setBillingService(service);
      
      // Calculate pre-filled labor cost based on selected services
      let calculatedLabor = 0;
      if (Array.isArray(service.serviceType)) {
          service.serviceType.forEach(item => {
              const sp = servicePrices.find(p => p.name === (item.name || item));
              if (sp) {
                  if (sp.category === 'Lubricant') {
                      calculatedLabor += (sp.price || 0) * (item.quantity || 1);
                  } else {
                      calculatedLabor += (sp.price || 0);
                  }
              }
          });
      }

      if (service.billing) {
          setBillingData({
              partsCost: service.billing.partsCost || 0,
              laborCost: service.billing.laborCost || calculatedLabor,
              discount: service.billing.discount || 0,
              extraServiceCost: service.billing.extraServiceCost || 0,
              extraServiceNotes: service.billing.extraServiceNotes || '',
              paymentStatus: service.billing.paymentStatus || 'Unpaid'
          });
      } else {
          setBillingData({ partsCost: 0, laborCost: calculatedLabor, discount: 0, extraServiceCost: 0, extraServiceNotes: '', paymentStatus: 'Unpaid' });
      }
      setCurrentView('billing');
  };

  const closeBillingModal = () => {
      setBillingService(null);
      setCurrentView('dashboard');
  };

  const handleBillingUpdate = async () => {
      if (!billingService) return;
      try {
          const res = await fetch(`${API_URL}/${billingService._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ billing: billingData })
          });

          if (res.ok) {
              alert('Billing details saved!');
              fetchServices();
              // Don't close modal immediately so they can print
          } else {
              alert('Failed to save billing');
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handlePrintInvoice = () => {
      window.print();
  };

  /* Admin Handlers */
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === '1132') { // Updated password as per user request
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleAddServicePrice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_PRICES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServicePrice)
      });
      if (res.ok) {
        setNewServicePrice({ name: '', price: 0 });
        fetchServicePrices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteServicePrice = async (id) => {
    if (!confirm('Delete this service type?')) return;
    try {
      const res = await fetch(`${API_PRICES_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) fetchServicePrices();
    } catch (err) {
      console.error(err);
    }
  };

  /* Search Logic */
  const filteredServices = services.filter(service => {
    // 1. Payment Status Filter
    if (showUnpaidOnly && service.billing?.paymentStatus === 'Paid') return false;

    // 2. Search Query Filter
    const query = searchQuery.toLowerCase();
    const matchesVehicleNumber = service.vehicleNumber?.toLowerCase().includes(query);
    const matchesVehicleName = service.vehicleName?.toLowerCase().includes(query);
    const matchesOwnerName = service.ownerName?.toLowerCase().includes(query);
    const matchesId = service.serviceId?.toString().includes(query) || service._id.toString().includes(query);
    
    return matchesVehicleNumber || matchesVehicleName || matchesOwnerName || matchesId;
  });

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Tharaka Service Center
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>manage your repair requests effortlessly</p>
        
        <div style={{ position: 'absolute', top: 0, right: 0 }}>
          {isAdminMode ? (
            <button className="btn" onClick={() => setIsAdminMode(false)} style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)' }}>Exit Admin</button>
          ) : (
            <button className="btn" onClick={() => setShowAdminLogin(true)} style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)' }}>Admin</button>
          )}
        </div>
      </header>

      {showAdminLogin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
          <div className="card" style={{ width: '300px' }}>
            <h2>Admin Login</h2>
            <form onSubmit={handleAdminLogin}>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input type="password" title="password ir" className="form-input" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Login</button>
                <button type="button" onClick={() => setShowAdminLogin(false)} className="btn" style={{ flex: 1, background: 'var(--surface-hover)', color: 'var(--text-primary)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdminMode && (
        <div className="card" style={{ marginBottom: '2rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--primary)' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Manage Service Types & Prices</h2>
          <form onSubmit={handleAddServicePrice} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
              <label className="input-label">Service Name</label>
              <input className="form-input" value={newServicePrice.name} onChange={e => setNewServicePrice({...newServicePrice, name: e.target.value})} required placeholder="e.g. Full Wash" />
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="input-label">Price (LKR)</label>
              <input type="number" className="form-input" value={newServicePrice.price} onChange={e => setNewServicePrice({...newServicePrice, price: parseFloat(e.target.value) || 0})} required />
            </div>
            <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="form-input" value={newServicePrice.category} onChange={e => setNewServicePrice({...newServicePrice, category: e.target.value})}>
                    <option value="Service">Service</option>
                    <option value="Lubricant">Lubricant</option>
                  </select>
            </div>
            <button type="submit" className="btn btn-primary">Add Item</button>
          </form>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {servicePrices.map(sp => (
              <div key={sp._id} style={{ background: 'var(--surface-hover)', padding: '0.8rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{sp.name}</div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      background: sp.category === 'Lubricant' ? '#059669' : '#3b82f6',
                      color: 'white'
                    }}>
                      {sp.category || 'Service'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>LKR {sp.price || 0}</div>
                </div>
                <button onClick={() => handleDeleteServicePrice(sp._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editingService && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Edit Service</h2>
                <form onSubmit={handleUpdate}>
                    <div className="input-group">
                        <label className="input-label">Vehicle Name</label>
                        <input className="form-input" value={editFormData.vehicleName} onChange={e => setEditFormData({...editFormData, vehicleName: e.target.value})} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Vehicle Number</label>
                        <input className="form-input" value={editFormData.vehicleNumber} onChange={e => setEditFormData({...editFormData, vehicleNumber: e.target.value})} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Owner Name</label>
                        <input className="form-input" value={editFormData.ownerName} onChange={e => setEditFormData({...editFormData, ownerName: e.target.value})} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Customer Contact</label>
                        <input className="form-input" value={editFormData.customerNumber} onChange={e => setEditFormData({...editFormData, customerNumber: e.target.value})} />
                    </div>
                    <div className="input-group">
                        {/* Service Dropdown */}
                        <div style={{ marginBottom: '1rem' }}>
                          <label className="input-label">Add Service (Labor)</label>
                          <select 
                            className="form-input" 
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !editFormData.serviceType.find(t => t.name === val)) {
                                setEditFormData({...editFormData, serviceType: [...editFormData.serviceType, { name: val, category: 'Service', quantity: 1, unitPrice: 0 }]});
                              }
                            }}
                          >
                            <option value="">Select a service...</option>
                            {servicePrices.filter(sp => sp.category !== 'Lubricant').map(sp => (
                              <option key={sp._id} value={sp.name}>{sp.name} (LKR {sp.price})</option>
                            ))}
                          </select>
                        </div>

                        {/* Lubricant Dropdown */}
                        <div style={{ marginBottom: '1rem' }}>
                          <label className="input-label">Add Lubricants</label>
                          <select 
                            className="form-input" 
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !editFormData.serviceType.find(t => t.name === val)) {
                                  const sp = servicePrices.find(p => p.name === val);
                                  setEditFormData({...editFormData, serviceType: [...editFormData.serviceType, { name: val, category: 'Lubricant', quantity: 1, unitPrice: sp ? sp.price : 0 }]});
                              }
                            }}
                          >
                            <option value="">Select a lubricant...</option>
                            {servicePrices.filter(sp => sp.category === 'Lubricant').map(sp => (
                              <option key={sp._id} value={sp.name}>{sp.name} (LKR {sp.price}/Ltr)</option>
                            ))}
                          </select>
                        </div>

                        {editFormData.serviceType.length > 0 && (
                            <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {editFormData.serviceType.map(item => {
                                    const sp = servicePrices.find(p => p.name === item.name);
                                    const isLube = sp && sp.category === 'Lubricant';

                                    return (
                                        <div key={item.name} style={{ 
                                            background: 'var(--primary)', 
                                            color: 'white', 
                                            padding: '0.4rem 0.8rem', 
                                            borderRadius: '12px', 
                                            fontSize: '0.86rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.4rem',
                                            minWidth: '200px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                                                <span 
                                                    onClick={() => setEditFormData({...editFormData, serviceType: editFormData.serviceType.filter(t => t.name !== item.name)})}
                                                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                                >&times;</span>
                                            </div>
                                            {isLube && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                    <span style={{ fontSize: '0.75rem' }}>Qty:</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        style={{ 
                                                            width: '60px', 
                                                            background: 'rgba(255,255,255,0.1)', 
                                                            border: '1px solid rgba(255,255,255,0.2)', 
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            fontSize: '0.8rem',
                                                            padding: '2px 4px'
                                                        }}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newQty = parseFloat(e.target.value) || 0;
                                                            setEditFormData({
                                                                ...editFormData,
                                                                serviceType: editFormData.serviceType.map(t => t.name === item.name ? { ...t, quantity: newQty } : t)
                                                            });
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.75rem' }}>Ltr @ {item.unitPrice}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="input-group">
                        <label className="input-label">Notes</label>
                        <textarea className="form-input" value={editFormData.notes} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} rows="3" />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                        <button type="button" onClick={closeEditModal} className="btn" style={{ flex: 1, background: 'var(--surface-hover)', color: 'var(--text-primary)' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {currentView === 'dashboard' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Add Service Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>New Request</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Vehicle Name</label>
              <input 
                className="form-input"
                value={formData.vehicleName}
                onChange={e => setFormData({...formData, vehicleName: e.target.value})}
                placeholder="e.g. Toyota Camry"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Vehicle Number</label>
              <input 
                className="form-input"
                value={formData.vehicleNumber}
                onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
                placeholder="e.g. ABC-1234"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Owner Name</label>
              <input 
                className="form-input"
                value={formData.ownerName}
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Customer Contact</label>
              <input 
                className="form-input"
                value={formData.customerNumber}
                onChange={e => setFormData({...formData, customerNumber: e.target.value})}
                placeholder="e.g. 555-0123"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Add Service Type</label>
                {/* Service Dropdown */}
                <div style={{ marginBottom: '1rem' }}>
                  <label className="input-label">Add Service</label>
                  <select 
                    className="form-input" 
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !formData.serviceType.find(t => t.name === val)) {
                        setFormData({...formData, serviceType: [...formData.serviceType, { name: val, category: 'Service', quantity: 1, unitPrice: 0 }]});
                      }
                    }}
                  >
                    <option value="">Select a service...</option>
                    {servicePrices.filter(sp => sp.category !== 'Lubricant').map(sp => (
                      <option key={sp._id} value={sp.name}>{sp.name} (LKR {sp.price})</option>
                    ))}
                  </select>
                </div>

                {/* Lubricant Dropdown */}
                <div style={{ marginBottom: '1rem' }}>
                  <label className="input-label">Add Lubricants</label>
                  <select 
                    className="form-input" 
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !formData.serviceType.find(t => t.name === val)) {
                          const sp = servicePrices.find(p => p.name === val);
                          setFormData({...formData, serviceType: [...formData.serviceType, { name: val, category: 'Lubricant', quantity: 1, unitPrice: sp ? sp.price : 0 }]});
                      }
                    }}
                  >
                    <option value="">Select a lubricant...</option>
                    {servicePrices.filter(sp => sp.category === 'Lubricant').map(sp => (
                      <option key={sp._id} value={sp.name}>{sp.name} (LKR {sp.price}/Ltr)</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {formData.serviceType.map(item => {
                    const sp = servicePrices.find(p => p.name === item.name);
                    const isLube = sp && sp.category === 'Lubricant';
                    
                    return (
                      <div key={item.name} style={{ 
                        background: 'var(--primary)', 
                        color: 'white', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '12px', 
                        fontSize: '0.86rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        minWidth: '200px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                          <span 
                            onClick={() => setFormData({...formData, serviceType: formData.serviceType.filter(t => t.name !== item.name)})}
                            style={{ cursor: 'pointer', fontWeight: 'bold' }}
                          >&times;</span>
                        </div>
                        {isLube && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem' }}>Qty:</span>
                            <input 
                              type="number" 
                              step="0.1"
                              style={{ 
                                width: '60px', 
                                background: 'rgba(255,255,255,0.1)', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                padding: '2px 4px'
                              }}
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = parseFloat(e.target.value) || 0;
                                setFormData({
                                  ...formData,
                                  serviceType: formData.serviceType.map(t => t.name === item.name ? { ...t, quantity: newQty } : t)
                                });
                              }}
                            />
                            <span style={{ fontSize: '0.75rem' }}>Ltr @ {item.unitPrice}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            </div>
            <div className="input-group">
              <label className="input-label">Notes</label>
              <textarea 
                className="form-input"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional details..."
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Create Request
            </button>
          </form>
        </div>

        {/* Service List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 0 }}>Active Services</h2>
              <div style={{ display: 'flex', background: 'var(--surface-hover)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                  onClick={() => setShowUnpaidOnly(false)}
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    background: !showUnpaidOnly ? 'var(--primary)' : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: !showUnpaidOnly ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  All
                </button>
                <button 
                  onClick={() => setShowUnpaidOnly(true)}
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    background: showUnpaidOnly ? 'var(--danger)' : 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: showUnpaidOnly ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  Unpaid
                </button>
              </div>
            </div>
            <input 
              className="form-input"
              style={{ width: '250px', padding: '0.5rem' }}
              placeholder="Search ID, Plate or Owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading services...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredServices.map(service => (
                <div key={service._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem' }}>{service.vehicleName}</h3>
                      <span className={`badge badge-${service.status.toLowerCase().replace(' ', '-')}`}>
                        {service.status}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      Owner: {service.ownerName} {service.customerNumber ? `(${service.customerNumber})` : ''} &bull; {
                        Array.isArray(service.serviceType) 
                          ? service.serviceType.map(t => typeof t === 'string' ? t : `${t.name}${t.quantity > 1 ? ` (${t.quantity} Ltr)` : ''}`).join(', ') 
                          : service.serviceType
                      } &bull; <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>#{service.serviceId || '...'}</span>
                    </p>
                    {service.vehicleNumber && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Plate: {service.vehicleNumber}
                        </p>
                    )}
                    {service.notes && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        "{service.notes}"
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <select 
                      className="form-input" 
                      style={{ padding: '0.4rem', fontSize: '0.85rem', width: 'auto' }}
                      value={service.status}
                      onChange={(e) => updateStatus(service._id, e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Ready">Ready</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button 
                            onClick={() => handleBillClick(service)}
                            className="btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#f59e0b', color: 'white' }}
                        >
                            Bill
                        </button>
                        <button 
                            onClick={() => deleteService(service._id)}
                            className="btn btn-danger"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                            Delete
                        </button>
                        <button 
                            onClick={() => handleEditClick(service)}
                            className="btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--surface-hover)', color: 'var(--text-primary)' }}
                        >
                            Edit
                        </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredServices.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No active services found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Billing View (Dedicated Page) */}
      {currentView === 'billing' && billingService && (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={closeBillingModal} className="btn" style={{ marginBottom: '2rem', background: 'var(--surface-hover)', color: 'var(--text-primary)' }}>&larr; Back to Dashboard</button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="card">
                  <h2 style={{ marginBottom: '1.5rem' }}>Billing & Invoice</h2>
                  <div className="input-group">
                      <label className="input-label">Vehicle: {billingService.vehicleName} ({billingService.vehicleNumber})</label>
                  </div>
                  <div className="input-group">
                      <label className="input-label">Parts Cost (LKR)</label>
                      <input 
                          type="number"
                          className="form-input" 
                          value={billingData.partsCost} 
                          onChange={e => setBillingData({...billingData, partsCost: parseFloat(e.target.value) || 0})}
                      />
                  </div>
                  <div className="input-group">
                      <label className="input-label">Labor Cost (LKR)</label>
                      <input 
                          type="number"
                          className="form-input" 
                          value={billingData.laborCost} 
                          onChange={e => setBillingData({...billingData, laborCost: parseFloat(e.target.value) || 0})}
                      />
                  </div>
                  <div className="input-group">
                      <label className="input-label">Extra Service Cost (LKR)</label>
                      <input 
                          type="number"
                          className="form-input" 
                          value={billingData.extraServiceCost} 
                          onChange={e => setBillingData({...billingData, extraServiceCost: parseFloat(e.target.value) || 0})}
                      />
                  </div>
                  <div className="input-group">
                      <label className="input-label">Extra Service Details</label>
                      <input 
                          type="text"
                          className="form-input" 
                          value={billingData.extraServiceNotes} 
                          onChange={e => setBillingData({...billingData, extraServiceNotes: e.target.value})}
                          placeholder="e.g. Under-carriage spray"
                      />
                  </div>

                  <div className="input-group">
                      <label className="input-label">Payment Status</label>
                      <select 
                          className="form-input"
                          value={billingData.paymentStatus}
                          onChange={e => setBillingData({...billingData, paymentStatus: e.target.value})}
                      >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                      </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                      <button onClick={handleBillingUpdate} className="btn btn-primary">Save Billing Details</button>
                      <button onClick={handlePrintInvoice} className="btn" style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)' }}>Print Invoice</button>
                  </div>
              </div>

              <div className="card" style={{ background: 'white', color: 'black' }}>
                  <h2 style={{ color: 'black', marginBottom: '1rem' }}>Preview</h2>
                  <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ margin: 0 }}>{billingService.vehicleName}</h3>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>#{billingService.serviceId}</p>
                      </div>
                      
                      <div style={{ margin: '1rem 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span>Subtotal:</span>
                              <span>LKR {(billingData.partsCost + billingData.laborCost + billingData.extraServiceCost).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span>Discount:</span>
                              <span style={{ color: 'green' }}>-LKR {billingData.discount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                              <span>Total:</span>
                              <span>LKR {(billingData.partsCost + billingData.laborCost + billingData.extraServiceCost - billingData.discount).toFixed(2)}</span>
                          </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', textAlign: 'center', color: '#666' }}>Status: {billingData.paymentStatus}</p>
                  </div>
              </div>
            </div>
        </div>
      )}

      {/* Invoice Printable View (Hidden by default, visible on print) */}
      <div className="invoice-print-view">
        {billingService && (
            <div style={{ padding: '2rem', color: 'black' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Tharaka Service Center</h1>
                    <p>Magura Raod, Baduraliya.</p>
                    <p>Phone: 034-2244003 / 071-2986482 | Email:tharakaservice@gmail.com</p>
                </div>
                
                <div style={{ borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <h4>Billed To:</h4>
                            <p>{billingService.ownerName}</p>
                            <p>{billingService.customerNumber}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h4>Invoice Details:</h4>
                            <p>Invoice #: {billingService.serviceId || '...'}</p>
                            <p>Date: {new Date().toLocaleDateString()}</p>
                            <p>Vehicle: {billingService.vehicleName} ({billingService.vehicleNumber})</p>
                        </div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Description</th>
                            <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(billingService.serviceType) && billingService.serviceType.map((item, idx) => {
                            const itemName = item.name || item;
                            const itemQty = item.quantity || 1;
                            const sp = servicePrices.find(p => p.name === itemName);
                            const unitPrice = sp ? (sp.price || 0) : 0;
                            const isLube = sp && sp.category === 'Lubricant';

                            return (
                                <tr key={idx}>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                        {itemName} {isLube ? `(${itemQty} Ltr @ LKR ${unitPrice}/Ltr)` : '(Labor)'}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                                        LKR {(unitPrice * itemQty).toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                        {!Array.isArray(billingService.serviceType) && (
                            <tr>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{billingService.serviceType} Service (Labor)</td>
                                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>LKR {billingData.laborCost.toFixed(2)}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Parts & Materials</td>
                            <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>LKR {billingData.partsCost.toFixed(2)}</td>
                        </tr>
                        {billingData.extraServiceCost > 0 && (
                            <tr>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Extra Services: {billingData.extraServiceNotes}</td>
                                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>LKR {billingData.extraServiceCost.toFixed(2)}</td>
                            </tr>
                        )}
                        {billingData.discount > 0 && (
                            <tr>
                                <td style={{ padding: '10px', borderBottom: '1px solid #eee', color: 'red' }}>Discount</td>
                                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', color: 'red' }}>-LKR {billingData.discount.toFixed(2)}</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style={{ padding: '15px 10px', fontWeight: 'bold' }}>Total</td>
                            <td style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>LKR {(billingData.partsCost + billingData.laborCost + billingData.extraServiceCost - billingData.discount).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                    <p style={{ fontStyle: 'italic' }}>Thank you</p>
                </div>
            </div>
        )}
      </div>

    </div>
  );
}

export default App;
