import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import PostTypeSelector from '../components/PostTypeSelector.jsx';
import AccountPicker from '../components/AccountPicker.jsx';
import MediaUploader from '../components/MediaUploader.jsx';
import MediaGrid from '../components/MediaGrid.jsx';
import CaptionEditor from '../components/CaptionEditor.jsx';
import ScheduleDateTimePicker from '../components/ScheduleDateTimePicker.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState } from '../components/states.jsx';
import { POST_TYPE_RULES } from '../utils/postConstants.js';
import * as postsService from '../services/postsService.js';
import '../styles/posts.css';

// Single-screen composer for creating a new post or editing an existing one.
// The URL param `:id` decides which mode: absent = create, present = edit.
// The form is a plain useState object - no forms library.
export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state. Media list holds full media objects (id, type, url, ...)
  // so we can render previews without re-fetching.
  const [instagramAccountId, setInstagramAccountId] = useState('');
  const [type, setType] = useState('FEED_IMAGE');
  const [caption, setCaption] = useState('');
  const [scheduledFor, setScheduledFor] = useState(null);
  const [medias, setMedias] = useState([]);
  const [existingStatus, setExistingStatus] = useState(null);

  // Load existing post when in edit mode.
  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      try {
        // Backend returns { success, post } at root.
        const { post } = await postsService.getPost(id);
        if (cancelled) return;
        setInstagramAccountId(post.instagramAccount?.id || '');
        setType(post.type);
        setCaption(post.caption || '');
        setScheduledFor(post.scheduledFor ? new Date(post.scheduledFor) : null);
        setMedias(post.medias || []);
        setExistingStatus(post.status);
      } catch (err) {
        if (!cancelled) {
          setToast({ tone: 'error', message: `Erro ao carregar post: ${err.message}` });
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  // If the user switches to a stricter type (e.g. CAROUSEL -> FEED_IMAGE),
  // trim the media list to fit and warn.
  const handleTypeChange = (nextType) => {
    setType(nextType);
    const rules = POST_TYPE_RULES[nextType];
    if (medias.length > rules.max) {
      setMedias((prev) => prev.slice(0, rules.max));
      setToast({
        tone: 'success',
        message: `As mídias extras foram removidas para caber no tipo ${nextType}.`,
      });
    }
  };

  const handleMediaUploaded = (media) => {
    setMedias((prev) => [...prev, media]);
  };

  const handleMediaRemove = (mediaId) => {
    setMedias((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handleMediaReorder = (from, to) => {
    if (to < 0 || to >= medias.length) return;
    setMedias((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const validate = (asSchedule) => {
    if (!instagramAccountId) return 'Selecione uma conta do Instagram.';
    const rules = POST_TYPE_RULES[type];
    if (medias.length < rules.min || medias.length > rules.max) {
      return `Este tipo aceita entre ${rules.min} e ${rules.max} mídia(s). Você tem ${medias.length}.`;
    }
    for (const m of medias) {
      if (!rules.allowed.includes(m.type)) {
        return `A mídia ${m.type} não é permitida em ${type}.`;
      }
    }
    if (asSchedule && !scheduledFor) {
      return 'Escolha uma data no campo "Agendar para" antes de agendar.';
    }
    return null;
  };

  // asSchedule=true forces sending scheduledFor; false saves as draft
  // (ignores the picked date, if any). This maps the two visible buttons
  // to the two intents without hiding what the user typed.
  const submit = async (asSchedule) => {
    const validationError = validate(asSchedule);
    if (validationError) {
      setToast({ tone: 'error', message: validationError });
      return;
    }

    setSaving(true);
    const payload = {
      instagramAccountId,
      type,
      caption: caption || null,
      mediaIds: medias.map((m) => m.id),
      scheduledFor: asSchedule && scheduledFor ? scheduledFor.toISOString() : null,
    };

    try {
      if (isEditing) {
        await postsService.updatePost(id, payload);
      } else {
        await postsService.createPost(payload);
      }
      const successMsg = asSchedule ? '✓ Post agendado.' : '✓ Rascunho salvo.';
      setToast({ tone: 'success', message: successMsg });
      setTimeout(() => navigate('/posts'), 900);
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="sf-page">
        <Header />
        <main className="sf-main">
          <DashboardCard title="Editar post">
            <LoadingState message="Carregando post..." />
          </DashboardCard>
        </main>
      </div>
    );
  }

  const isCarousel = type === 'FEED_CAROUSEL';
  const scheduleLabel = isEditing && existingStatus === 'SCHEDULED' ? 'Atualizar agendamento' : 'Agendar post';
  const draftLabel = isEditing && existingStatus === 'DRAFT' ? 'Salvar rascunho' : 'Salvar como rascunho';

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main">
        <DashboardCard
          title={isEditing ? 'Editar post' : 'Novo post'}
          subtitle={isEditing ? undefined : 'Configure o post e salve como rascunho ou agende.'}
          actions={
            <button
              type="button"
              className="sf-button sf-button--secondary"
              onClick={() => navigate('/posts')}
              disabled={saving}
            >
              Cancelar
            </button>
          }
        >
          <div className="sf-post-editor">
            <section className="sf-post-editor__section">
              <h3 className="sf-post-editor__section-title">1. Conta de destino</h3>
              <AccountPicker
                value={instagramAccountId}
                onChange={setInstagramAccountId}
                disabled={saving}
              />
            </section>

            <section className="sf-post-editor__section">
              <h3 className="sf-post-editor__section-title">2. Tipo de post</h3>
              <PostTypeSelector value={type} onChange={handleTypeChange} disabled={saving} />
            </section>

            <section className="sf-post-editor__section">
              <h3 className="sf-post-editor__section-title">3. Mídias</h3>
              <MediaGrid
                medias={medias}
                onRemove={handleMediaRemove}
                onReorder={handleMediaReorder}
                isCarousel={isCarousel}
              />
              <MediaUploader
                postType={type}
                currentCount={medias.length}
                onUploaded={handleMediaUploaded}
                onError={(msg) => setToast({ tone: 'error', message: msg })}
              />
            </section>

            <section className="sf-post-editor__section">
              <h3 className="sf-post-editor__section-title">4. Legenda</h3>
              <CaptionEditor value={caption} onChange={setCaption} disabled={saving} />
            </section>

            <section className="sf-post-editor__section">
              <h3 className="sf-post-editor__section-title">5. Agendamento</h3>
              <ScheduleDateTimePicker
                value={scheduledFor}
                onChange={setScheduledFor}
                disabled={saving}
              />
            </section>

            <div className="sf-post-editor__submit">
              <button
                type="button"
                className="sf-button sf-button--secondary"
                onClick={() => submit(false)}
                disabled={saving}
              >
                {saving ? 'Salvando...' : draftLabel}
              </button>
              <button
                type="button"
                className="sf-button sf-button--primary"
                onClick={() => submit(true)}
                disabled={saving || !scheduledFor}
                title={
                  !scheduledFor
                    ? 'Escolha uma data no campo "Agendar para" acima'
                    : undefined
                }
              >
                {saving ? 'Salvando...' : scheduleLabel}
              </button>
            </div>
          </div>
        </DashboardCard>
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}