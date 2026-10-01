import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Phone, Edit, Settings, Camera, Shield, X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Profile() {
  const { user, updateUser, token } = useAuth();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    exam_type: user?.exam_type || ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || localStorage.getItem('preplyx_avatar') || null);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    let uploadedUrl: string | null = null;

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', 'preplyx');
      data.append('cloud_name', 'dl4smhb8s');

      const res = await fetch('https://api.cloudinary.com/v1_1/dl4smhb8s/image/upload', {
        method: 'POST',
        body: data
      });

      if (res.ok) {
        const json = await res.json();
        uploadedUrl = json.secure_url || json.url || null;
      }
    } catch (err) {
      console.warn('Cloudinary upload failed, falling back to FileReader:', err);
    }

    // Local Data URL fallback if Cloudinary upload returned 400 or failed
    if (!uploadedUrl) {
      uploadedUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    if (uploadedUrl) {
      setAvatarUrl(uploadedUrl);
      localStorage.setItem('preplyx_avatar', uploadedUrl);
      updateUser({ avatar: uploadedUrl });

      if (token) {
        api.updateUserProfile(token, { avatar: uploadedUrl }).catch(() => {});
      }
    }

    setUploadingAvatar(false);
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const data = await api.getUserProfile(token);
        updateUser({
          full_name: data.name,
          email: data.email,
          phone: data.phone,
          exam_type: data.exam_type,
        });
        
        setFormData({
          full_name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          exam_type: data.exam_type || ''
        });
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [token]);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || user.name || '',
        email: user.email,
        phone: user.phone || '',
        exam_type: user.exam_type || ''
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      await api.updateUserProfile(token, {
        name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        exam_type: formData.exam_type
      });

      updateUser({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        exam_type: formData.exam_type
      });

      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '800px', margin: '0 auto' }}>
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        id="avatar-file-input"
        accept="image/*"
        onChange={handleAvatarSelect}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
          Profile & Account
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Manage your personal information, profile photo, and exam preferences
        </p>
      </div>

      {/* Main Profile Card */}
      <div style={{
        padding: '32px', borderRadius: '20px', backgroundColor: '#fff',
        border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
        marginBottom: '28px'
      }}>
        {/* Avatar & Header Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                style={{
                  width: '84px', height: '84px', borderRadius: '50%',
                  objectFit: 'cover', border: '3px solid #7B2FF7',
                  boxShadow: '0 4px 12px rgba(123, 47, 247, 0.25)'
                }}
              />
            ) : (
              <div style={{
                width: '84px', height: '84px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
                color: '#fff', fontSize: '24px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}

            {/* Cloudinary Camera Upload Button */}
            <button
              onClick={() => document.getElementById('avatar-file-input')?.click()}
              disabled={uploadingAvatar}
              title="Upload Profile Picture via Cloudinary"
              style={{
                position: 'absolute', bottom: '-2px', right: '-2px',
                width: '30px', height: '30px', borderRadius: '50%',
                backgroundColor: '#7B2FF7', color: '#fff', border: '2px solid #fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <Camera size={15} />
            </button>
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
              {user?.name || user?.full_name || 'Student Candidate'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              {user?.email || 'student@preplyx.com'}
            </p>
            {uploadingAvatar && (
              <div style={{ fontSize: '11px', color: '#7B2FF7', fontWeight: 700, marginTop: '4px' }}>
                Uploading photo to Cloudinary...
              </div>
            )}
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            style={{
              padding: '10px 18px', borderRadius: '12px',
              background: 'var(--gradient-primary)', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Edit size={16} /> Edit Profile
          </button>
        </div>

        {/* Profile Details List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#64748b' }}>
              <UserIcon size={16} />
              <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Full Name</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
              {user?.full_name || user?.name || 'Not provided'}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#64748b' }}>
              <Mail size={16} />
              <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Email Address</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
              {user?.email || 'Not provided'}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#64748b' }}>
              <Phone size={16} />
              <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Phone Number</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
              {user?.phone || 'Not provided'}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#64748b' }}>
              <Shield size={16} />
              <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>Primary Exam Target</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#7B2FF7' }}>
              {user?.exam_type || 'JAMB UTME'}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '32px',
            maxWidth: '480px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Edit Profile Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--gradient-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
