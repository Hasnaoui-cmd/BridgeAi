import { useState, useEffect } from 'react';
import { ShieldCheck, Users, BookOpen, Trash2, Upload, Loader2, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type Tab = 'users' | 'knowledge';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

interface DocumentChunk {
  uuid: string;
  document: string | null;
  cmetadata: any;
  collection_id: string | null;
}
interface RegistryDocument {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
  storage_url: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'knowledge' | 'registry'>('users');

  return (
    <div className="h-full p-8 overflow-y-auto">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-amber-100 rounded-xl">
            <ShieldCheck size={22} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-serif text-stone-800">Admin Dashboard</h2>
            <p className="text-stone-500 text-sm mt-0.5">Manage users and knowledge base</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex space-x-1 mt-8 bg-stone-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'users'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <Users size={16} />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'knowledge'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <BookOpen size={16} />
            <span>Knowledge Base (Chunks)</span>
          </button>

          <button
            onClick={() => setActiveTab('registry')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'registry'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <BookOpen size={16} />
            <span>File Manager (Registry)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'knowledge' && <KnowledgeBaseTab />}
          {activeTab === 'registry' && <FileManager />} {/* Add the component here */}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userToProcess, setUserToProcess] = useState<UserProfile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!currentUser || targetUserId === currentUser.id) return;
    setProcessingId(targetUserId);
    try {
      const response = await fetch(`http://localhost:8000/admin/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, admin_id: currentUser.id }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Failed to connect to backend.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = (targetUser: UserProfile) => {
    if (!currentUser || targetUser.id === currentUser.id) return;
    setUserToProcess(targetUser);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentUser || !userToProcess) return;
    const targetUser = userToProcess;
    setIsDeleteModalOpen(false);
    setUserToProcess(null);
    setProcessingId(targetUser.id);
    console.log(`[DEBUG] Attempting to delete Target User ID: ${targetUser.id}`);
    console.log(`[DEBUG] Authenticated Admin ID sending request: ${currentUser.id}`);
    try {
      const response = await fetch(`http://localhost:8000/admin/users/${targetUser.id}?admin_id=${currentUser.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok || result.status === 'success') {
        setUsers(prev => prev.filter(u => u.id !== targetUser.id));
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Failed to connect to backend.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Search Bar */}
      <div className="p-5 border-b border-stone-100 flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
          />
        </div>
        <div className="text-sm text-stone-500 ml-4">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">User</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Joined</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 uppercase font-bold text-xs flex-shrink-0">
                      {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <span className="font-medium text-stone-800 text-sm">
                      {user.full_name || 'Unnamed'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">
                  {user.email || '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <select
                      value={user.role || 'user'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.id === currentUser?.id || processingId === user.id}
                      className={`text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 transition-colors cursor-pointer ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    {processingId === user.id && <Loader2 size={14} className="animate-spin text-stone-400" />}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })
                    : '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.id === currentUser?.id || processingId === user.id}
                    className={`p-2 rounded-lg transition-colors ${
                      user.id === currentUser?.id 
                        ? 'text-stone-300 cursor-not-allowed' 
                        : 'text-stone-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title={user.id === currentUser?.id ? "Cannot delete yourself" : "Delete user"}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        user={userToProcess}
        onCancel={() => { setIsDeleteModalOpen(false); setUserToProcess(null); }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Knowledge Base Tab
// ─────────────────────────────────────────────
function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); // Track upload status

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('langchain_pg_embedding')
        .select('id, document, cmetadata, collection_id')
        .order('id', { ascending: true })
        .limit(100);

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };
  const { user } = useAuth();
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return; // Ensure we have a user ID

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', user.id); // <--- Add this!
    formData.append('document_type', 'regulation');


    try {
      // Point this to your FastAPI backend
      const response = await fetch('http://localhost:8000/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.status === 'success') {
        alert(result.message);
        fetchDocuments(); // Refresh the list to see new chunks!
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      alert('Failed to connect to backend server.');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document chunk?')) return;
    try {
      const { error } = await supabase
        .from('langchain_pg_embedding')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.uuid !== uuid));
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete. Check console for details.');
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{documents.length} chunks</p>

        {/* The Action Button */}
        <label className={`flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all shadow-sm cursor-pointer ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          <span>{uploading ? 'Vectorizing...' : 'Upload PDF'}</span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => {
          const source = doc.cmetadata?.source || 'Unknown source';
          const page = doc.cmetadata?.page !== undefined ? `Page ${doc.cmetadata.page + 1}` : '';
          const preview = doc.document
            ? doc.document.substring(0, 180) + (doc.document.length > 180 ? '...' : '')
            : 'No content';

          return (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow transition-shadow group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="p-1.5 bg-stone-100 rounded-lg flex-shrink-0">
                    <BookOpen size={14} className="text-stone-500" />
                  </div>
                  <span className="text-xs font-mono text-stone-400 truncate">
                    {source.split('/').pop() || source}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete chunk"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Content Preview */}
              <p className="text-sm text-stone-600 leading-relaxed line-clamp-4 mb-3">
                {preview}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                {page && (
                  <span className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded">
                    {page}
                  </span>
                )}
                <span className="text-xs text-stone-300 font-mono">
                  {doc.id.substring(0, 8)}...
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <BookOpen size={40} className="mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500 text-sm">No documents in the knowledge base</p>
          <p className="text-stone-400 text-xs mt-1">Upload a PDF to get started</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────
function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
      <div className="flex items-center justify-center space-x-3 text-stone-400 mb-8">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading data...</span>
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="w-9 h-9 bg-stone-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-stone-100 rounded-full w-1/3" />
              <div className="h-2.5 bg-stone-50 rounded-full w-1/2" />
            </div>
            <div className="h-6 w-16 bg-stone-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}


//lists the contents of the compliance_documents table

function FileManager() {
  const [files, setFiles] = useState<RegistryDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('compliance_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setFiles(data || []);
    setLoading(false);
  };

  const handleDeleteFile = async (filename: string, docId: string) => {
    if (!confirm(`Warning: This will delete the file, the registry record, AND all AI vectors for "${filename}". Continue?`)) return;

    try {
      // Call your backend to handle the multi-stage deletion
      const response = await fetch(`http://localhost:8000/admin/delete-document/${docId}?filename=${filename}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== docId));
        alert('File and all AI vectors deleted successfully.');
      }
    } catch (err) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mt-8">
      <div className="p-4 border-b border-stone-100 font-medium">Registry: Uploaded Files</div>
      <table className="w-full text-sm text-left">
        <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
          <tr>
            <th className="px-6 py-3">File Name</th>
            <th className="px-6 py-3">Type</th>
            <th className="px-6 py-3">Uploaded At</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {files.map(file => (
            <tr key={file.id} className="hover:bg-stone-50 transition-colors">
              <td className="px-6 py-4 font-medium">{file.document_name}</td>
              <td className="px-6 py-4 text-stone-500">{file.document_type}</td>
              <td className="px-6 py-4 text-stone-500">{new Date(file.created_at).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => handleDeleteFile(file.document_name, file.id)}
                  className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────
interface DeleteConfirmModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ isOpen, user, onCancel, onConfirm }: DeleteConfirmModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Blurred overlay */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">

        {/* Red warning icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-xl font-semibold text-stone-900 text-center mb-2">
          Permanently delete user?
        </h3>

        {/* Description */}
        <p className="text-sm text-stone-500 text-center leading-relaxed mb-1">
          You are about to permanently delete{' '}
          <span className="font-semibold text-stone-800">
            {user.full_name || user.email}
          </span>
          's account.
        </p>
        <p className="text-xs text-red-500 text-center mb-7">
          This will remove them from authentication and all associated data. This action cannot be undone.
        </p>

        {/* User info card */}
        <div className="flex items-center space-x-3 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 mb-7">
          <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 uppercase font-bold text-xs flex-shrink-0">
            {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">{user.full_name || 'Unnamed'}</p>
            <p className="text-xs text-stone-400 truncate">{user.email}</p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-lg ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
            {user.role}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
