import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/musicApi';
import { User, Edit3, Save, Music, ListMusic, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Profil() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    usersApi.getProfile().then(r => {
      setProfile(r.data);
      setUsername(r.data.username);
      setBio(r.data.bio || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      const { data } = await usersApi.updateProfile({ username, bio });
      setProfile(prev => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Profil aktualisiert!');
    } catch { toast.error('Fehler beim Speichern'); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await usersApi.uploadAvatar(formData);
      setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      toast.success('Avatar hochgeladen!');
    } catch { toast.error('Fehler beim Upload'); }
  };

  if (!profile) return <div className="text-hf-text-muted text-center py-12">Laden...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="profile-title">Profil</h1>

      {/* Avatar + Info */}
      <div className="bg-hf-surface border border-hf-border rounded-2xl p-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="relative group">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-hf-gold/30" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-hf-gold/10 flex items-center justify-center border-2 border-hf-gold/30">
                <User size={36} className="text-hf-gold" />
              </div>
            )}
            <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
              <Edit3 size={18} className="text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" data-testid="avatar-upload-input" />
            </label>
          </div>
          <div>
            {editing ? (
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                className="bg-hf-bg border border-hf-border rounded-xl px-3 py-2 text-white focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none text-lg font-bold"
                data-testid="profile-username-input"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
            )}
            <p className="text-sm text-hf-text-muted">{profile.email}</p>
            <p className="text-xs text-hf-text-muted uppercase tracking-widest mt-1">{profile.role}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="text-xs tracking-widest uppercase font-bold text-hf-text-muted mb-2 block">Bio</label>
          {editing ? (
            <textarea
              value={bio} onChange={e => setBio(e.target.value)}
              className="w-full bg-hf-bg border border-hf-border rounded-xl px-4 py-3 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none resize-none h-24"
              placeholder="Erzaehl etwas ueber dich..."
              data-testid="profile-bio-input"
            />
          ) : (
            <p className="text-hf-text-muted text-sm">{profile.bio || 'Keine Bio vorhanden'}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {editing ? (
            <>
              <button onClick={handleSave} className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-6 py-2.5 rounded-full flex items-center gap-2 text-sm transition-all" data-testid="profile-save-button">
                <Save size={16} /> Speichern
              </button>
              <button onClick={() => { setEditing(false); setUsername(profile.username); setBio(profile.bio || ''); }} className="bg-white/5 text-white px-6 py-2.5 rounded-full text-sm hover:bg-white/10 transition-all">
                Abbrechen
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="bg-white/5 text-white font-medium px-6 py-2.5 rounded-full flex items-center gap-2 text-sm hover:bg-white/10 transition-all" data-testid="profile-edit-button">
              <Edit3 size={16} /> Bearbeiten
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Music, label: 'Songs', value: profile.songs_count || 0 },
          { icon: ListMusic, label: 'Follower', value: profile.followers_count || 0 },
          { icon: Heart, label: 'Following', value: profile.following_count || 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-hf-surface border border-hf-border rounded-xl p-4 text-center">
            <Icon size={18} className="text-hf-gold mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-hf-text-muted uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
