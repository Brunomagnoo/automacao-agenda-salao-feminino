import { useEffect, useState, useCallback } from 'react';
import { fmtDate, fmtPhone } from './utils';

interface User {
  id: string;
  uniqueCode: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'CLIENT';
  createdAt: string;
  deletedAt: string | null;
}

export default function UsuariosTab({ isAuthed }: { isAuthed: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'CLIENT' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?includeDeleted=${showDeleted}`);
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showDeleted]);

  useEffect(() => {
    if (isAuthed) fetchUsers();
  }, [isAuthed, fetchUsers]);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, phone: user.phone, role: user.role });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchUsers();
      } else {
        alert('Erro ao salvar alterações.');
      }
    } catch (err) {
      alert('Erro ao salvar alterações.');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('Deseja resetar a senha deste usuário para "123456"?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }),
      });
      if (res.ok) {
        alert('Senha resetada com sucesso para "123456"!');
      } else {
        alert('Erro ao resetar senha.');
      }
    } catch (err) {
      alert('Erro ao resetar senha.');
    }
  };

  const handleDelete = async (id: string) => {
    const keepHistory = confirm('Clique em OK para APAGAR COM HISTÓRICO (Soft Delete) ou CANCELAR para outras opções.');
    let hardDelete = false;

    if (!keepHistory) {
      const hard = confirm('Deseja DELETAR DEFINITIVAMENTE (Hard Delete)? Atenção: todos os agendamentos financeiros deste cliente também serão apagados para sempre.');
      if (!hard) return; // Cancelou tudo
      hardDelete = true;
    }

    try {
      const res = await fetch(`/api/admin/users/${id}?hardDelete=${hardDelete}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Erro ao deletar usuário.');
        return;
      }
      
      alert(hardDelete ? 'Usuário e agendamentos apagados definitivamente.' : 'Usuário apagado (Soft Delete). Histórico financeiro mantido.');
      fetchUsers();
    } catch (err) {
      alert('Erro na requisição.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.phone.includes(s) || u.uniqueCode.includes(s);
  });

  return (
    <div className="adm-section fade-in">
      <div className="adm-section__header">
        <h2>Contas e Usuários</h2>
        <span className="adm-section__count">{users.length} usuário(s)</span>
      </div>

      <div className="adm-filters">
        <div className="adm-filter" style={{ flex: 1 }}>
          <label>Buscar</label>
          <input
            type="text"
            placeholder="Nome, telefone ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="adm-filter" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
            />
            Mostrar deletados
          </label>
        </div>
      </div>

      {loading ? (
        <div className="adm-loading">
          <div className="adm-loading__spinner" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="adm-empty">
          <p>Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="adm-cards">
          {filteredUsers.map((u) => {
            const isEditing = editingId === u.id;
            const isDeleted = u.deletedAt !== null;

            return (
              <div key={u.id} className={`adm-card${isDeleted ? ' adm-card--cancelled' : ''}`} style={{ opacity: isDeleted ? 0.7 : 1 }}>
                <div className="adm-card__body" style={{ display: 'block' }}>
                  
                  {isEditing ? (
                    <div className="adm-card__grid" style={{ marginBottom: '16px' }}>
                      <div className="adm-card__field">
                        <label>Nome</label>
                        <input 
                          type="text" 
                          value={editForm.name} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                        />
                      </div>
                      <div className="adm-card__field">
                        <label>Telefone</label>
                        <input 
                          type="text" 
                          value={editForm.phone} 
                          onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                        />
                      </div>
                      <div className="adm-card__field">
                        <label>Cargo (Role)</label>
                        <select 
                          value={editForm.role}
                          onChange={e => setEditForm({...editForm, role: e.target.value as 'ADMIN'|'CLIENT'})}
                          style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                        >
                          <option value="CLIENT">CLIENT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="adm-card__grid" style={{ marginBottom: '16px' }}>
                      <div className="adm-card__field">
                        <label>Nome</label>
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>
                          {u.name} {isDeleted && '(Deletado)'}
                        </span>
                      </div>
                      <div className="adm-card__field">
                        <label>Telefone</label>
                        <span>{fmtPhone(u.phone)}</span>
                      </div>
                      <div className="adm-card__field">
                        <label>Código / Data Cad.</label>
                        <span>{u.uniqueCode} • {fmtDate(u.createdAt.split('T')[0])}</span>
                      </div>
                      <div className="adm-card__field">
                        <label>Cargo</label>
                        <span className={`adm-badge ${u.role === 'ADMIN' ? 'adm-badge--confirmed' : 'adm-badge--pending'}`}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="adm-card__actions">
                    {isEditing ? (
                      <>
                        <button className="adm-btn adm-btn--confirm" onClick={() => handleSaveEdit(u.id)}>
                          Salvar
                        </button>
                        <button className="adm-btn" onClick={() => setEditingId(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="adm-btn adm-btn--primary" onClick={() => handleEdit(u)} disabled={isDeleted}>
                          Editar
                        </button>
                        <button className="adm-btn" onClick={() => handleResetPassword(u.id)} disabled={isDeleted}>
                          Resetar Senha
                        </button>
                        <button className="adm-btn adm-btn--cancel" onClick={() => handleDelete(u.id)} disabled={isDeleted}>
                          Excluir Conta
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
