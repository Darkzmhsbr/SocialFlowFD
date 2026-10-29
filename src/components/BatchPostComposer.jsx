import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from './DashboardCard.jsx';
import PostTypeSelector from './PostTypeSelector.jsx';
import MediaUploader from './MediaUploader.jsx';
import MediaGrid from './MediaGrid.jsx';
import CoverPicker from './CoverPicker.jsx';
import CaptionEditor from './CaptionEditor.jsx';
import ScheduleDateTimePicker from './ScheduleDateTimePicker.jsx';
import Toast from './Toast.jsx';
import PublishModeToggle from './PublishModeToggle.jsx';
import AccountMultiSelect from './AccountMultiSelect.jsx';
import BatchMediaUploader from './BatchMediaUploader.jsx';
import BatchItemList from './BatchItemList.jsx';
import BatchScheduleOptions from './BatchScheduleOptions.jsx';
import { POST_TYPE_RULES, BATCH_LIMITS, STAGGER_DEFAULTS } from '../utils/postConstants.js';
import * as postsService from '../services/postsService.js';
// Rodada 4.1: live limits from the backend (BATCH_LIMITS is the fallback).
import { useBatchLimits } from '../hooks/useBatchLimits.js';
import '../styles/posts.css';
import '../styles/batch.css';

// Rodada 4: multi-profile batch composer (POST /api/posts/batch).
//
// Rendered by PostEditor when the user picks "Vários perfis" while creating
// a post. Every media item becomes one post on every selected profile:
// 3 Reels x 10 profiles = 30 independent posts sharing a batchId.
//
//   - Single-media types (Reel, video, photo, story): many files at once,
//     up to limits.maxItems, each one its own item.
//   - Carousel: all media form ONE item (one carousel per profile), using
//     the same MediaGrid/MediaUploader as the single composer.
//
// Shared caption/cover apply to every item unless the item overrides them.
// The caption accepts spintax ({Oi|Olá}) — the backend picks one option per
// post, so profiles don't receive identical text.
export default function BatchPostComposer({ onSwitchToSingle }) {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [accountIds, setAccountIds] = useState([]);
  const [type, setType] = useState('REEL');
  const [items, setItems] = useState([]); // non-carousel types
  const [carouselMedias, setCarouselMedias] = useState([]); // carousel only
  const [cover, setCover] = useState(null); // shared cover
  const [caption, setCaption] = useState(''); // shared caption
  const [scheduledFor, setScheduledFor] = useState(null);
  const [stagger, setStagger] = useState(STAGGER_DEFAULTS);
  // Rodada 4.1: replaces the direct BATCH_LIMITS reads below.
  const limits = useBatchLimits();

  const rules = POST_TYPE_RULES[type];
  const isCarousel = type === 'FEED_CAROUSEL';
  const allowsCover = Boolean(rules?.allowsCover);
  const itemCount = isCarousel ? (carouselMedias.length > 0 ? 1 : 0) : items.length;
  const totalPosts = itemCount * accountIds.length;

  // Switching type: drop covers the new type can't use, and warn about
  // items whose media type is no longer allowed (validate() blocks submit
  // until the user removes them).
  const handleTypeChange = (nextType) => {
    setType(nextType);
    const nextRules = POST_TYPE_RULES[nextType];

    if (!nextRules.allowsCover) {
      setCover(null);
      setItems((prev) => prev.map((it) => ({ ...it, coverMode: 'shared', cover: null })));
    }

    if (nextType !== 'FEED_CAROUSEL') {
      const invalid = items.filter((it) => !nextRules.allowed.includes(it.media.type)).length;
      if (invalid > 0) {
        setToast({
          tone: 'error',
          message: `${invalid} mídia(s) da lista não são aceitas em ${nextType}. Remova antes de salvar.`,
        });
      }
    } else if (carouselMedias.length > nextRules.max) {
      setCarouselMedias((prev) => prev.slice(0, nextRules.max));
    }
  };

  const handleItemUploaded = (media) => {
    setItems((prev) => [
      ...prev,
      {
        key: `${media.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        media,
        useOwnCaption: false,
        caption: '',
        coverMode: 'shared',
        cover: null,
      },
    ]);
  };

  const handleCarouselUploaded = (media) => setCarouselMedias((prev) => [...prev, media]);
  const handleCarouselRemove = (mediaId) => setCarouselMedias((prev) => prev.filter((m) => m.id !== mediaId));
  const handleCarouselReorder = (from, to) => {
    if (to < 0 || to >= carouselMedias.length) return;
    setCarouselMedias((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const validate = (asSchedule) => {
    if (accountIds.length === 0) return 'Selecione pelo menos um perfil.';

    if (isCarousel) {
      if (carouselMedias.length < rules.min || carouselMedias.length > rules.max) {
        return `O carrossel aceita entre ${rules.min} e ${rules.max} mídias. Você tem ${carouselMedias.length}.`;
      }
      for (const m of carouselMedias) {
        if (!rules.allowed.includes(m.type)) return `A mídia ${m.type} não é permitida no carrossel.`;
      }
    } else {
      if (items.length === 0) return 'Adicione pelo menos uma mídia.';
      if (items.length > limits.maxItems) {
        return `Máximo de ${limits.maxItems} mídias por lote. Você tem ${items.length}.`;
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!rules.allowed.includes(it.media.type)) {
          return `Mídia ${i + 1}: ${it.media.type === 'VIDEO' ? 'vídeo' : 'imagem'} não é aceito em ${type}.`;
        }
        if (allowsCover && it.coverMode === 'own' && !it.cover) {
          return `Mídia ${i + 1}: escolha a capa própria ou mude para "Usar a capa geral".`;
        }
        if (it.useOwnCaption && !it.caption.trim()) {
          return `Mídia ${i + 1}: escreva a legenda própria ou desmarque a opção.`;
        }
      }
    }

    if (totalPosts > limits.maxPosts) {
      return `Este lote geraria ${totalPosts} posts (máximo ${limits.maxPosts}). Reduza mídias ou perfis.`;
    }
    if (cover && !allowsCover) return `Posts do tipo ${type} não aceitam capa customizada.`;
    if (cover && cover.type !== 'IMAGE') return 'A capa precisa ser uma imagem.';
    if (asSchedule && !scheduledFor) return 'Escolha uma data no campo "Agendar para" antes de agendar.';
    return null;
  };

  const buildItems = () => {
    if (isCarousel) {
      return [{ mediaIds: carouselMedias.map((m) => m.id) }];
    }
    return items.map((it) => {
      const item = { mediaIds: [it.media.id] };
      if (it.useOwnCaption) item.caption = it.caption;
      if (allowsCover && it.coverMode === 'own') item.coverMediaAssetId = it.cover?.id ?? null;
      if (allowsCover && it.coverMode === 'none') item.coverMediaAssetId = null;
      // 'shared' -> field omitted -> backend uses the shared cover
      return item;
    });
  };

  const submit = async (asSchedule) => {
    const validationError = validate(asSchedule);
    if (validationError) {
      setToast({ tone: 'error', message: validationError });
      return;
    }

    setSaving(true);
    const payload = {
      instagramAccountIds: accountIds,
      type,
      items: buildItems(),
      caption: caption || null,
      coverMediaAssetId: allowsCover ? cover?.id ?? null : null,
      scheduledFor: asSchedule && scheduledFor ? scheduledFor.toISOString() : null,
      stagger,
      useSpintax: true,
    };

    try {
      const { batch } = await postsService.createPostBatch(payload);
      const total = batch?.total ?? totalPosts;
      const profiles = batch?.accounts ?? accountIds.length;
      setToast({
        tone: 'success',
        message: asSchedule
          ? `✓ Lote agendado: ${total} posts em ${profiles} perfil(is).`
          : `✓ ${total} rascunhos salvos em ${profiles} perfil(is).`,
      });
      setTimeout(() => navigate('/posts'), 1200);
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Dynamic numbering, same idea as the single composer.
  let n = 3;
  const coverNum = allowsCover ? String(++n) : null;
  const captionNum = String(++n);
  const scheduleNum = String(++n);

  return (
    <>
      <DashboardCard
        title="Novo post em vários perfis"
        subtitle="Suba as mídias, marque os perfis e publique tudo de uma vez."
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
          <PublishModeToggle
            value="batch"
            onChange={(mode) => mode === 'single' && onSwitchToSingle?.()}
            disabled={saving}
          />

          <section className="sf-post-editor__section">
            <h3 className="sf-post-editor__section-title">1. Perfis de destino</h3>
            <AccountMultiSelect
              value={accountIds}
              onChange={setAccountIds}
              disabled={saving}
              maxAccounts={limits.maxAccounts}
            />
          </section>

          <section className="sf-post-editor__section">
            <h3 className="sf-post-editor__section-title">2. Tipo de post</h3>
            <PostTypeSelector value={type} onChange={handleTypeChange} disabled={saving} />
          </section>

          <section className="sf-post-editor__section">
            <h3 className="sf-post-editor__section-title">3. Mídias</h3>
            {isCarousel ? (
              <>
                <p className="sf-field-hint">
                  No carrossel, todas as mídias formam 1 post, publicado em cada perfil selecionado.
                </p>
                <MediaGrid
                  medias={carouselMedias}
                  onRemove={handleCarouselRemove}
                  onReorder={handleCarouselReorder}
                  isCarousel
                />
                <MediaUploader
                  postType={type}
                  currentCount={carouselMedias.length}
                  onUploaded={handleCarouselUploaded}
                  onError={(msg) => setToast({ tone: 'error', message: msg })}
                />
              </>
            ) : (
              <>
                <BatchMediaUploader
                  postType={type}
                  currentCount={items.length}
                  max={limits.maxItems}
                  onUploaded={handleItemUploaded}
                  onError={(msg) => setToast({ tone: 'error', message: msg })}
                  disabled={saving}
                />
                <BatchItemList items={items} onChange={setItems} allowsCover={allowsCover} disabled={saving} />
              </>
            )}
          </section>

          {allowsCover && (
            <section className="sf-post-editor__section">
              <h3 className="sf-post-editor__section-title">{coverNum}. Capa geral (opcional)</h3>
              <p className="sf-field-hint">Usada em todas as mídias marcadas com &quot;Usar a capa geral&quot;.</p>
              <CoverPicker value={cover} onChange={setCover} disabled={saving} />
            </section>
          )}

          <section className="sf-post-editor__section">
            <h3 className="sf-post-editor__section-title">{captionNum}. Legenda geral</h3>
            <CaptionEditor value={caption} onChange={setCaption} disabled={saving} />
            <p className="sf-field-hint">
              Dica: escreva <code>{'{Oi|Olá|E aí}'}</code> para cada perfil receber uma variação diferente do texto.
              {type === 'STORY' && ' Stories não exibem legenda no Instagram.'}
            </p>
          </section>

          <section className="sf-post-editor__section">
            <h3 className="sf-post-editor__section-title">{scheduleNum}. Agendamento</h3>
            <ScheduleDateTimePicker value={scheduledFor} onChange={setScheduledFor} disabled={saving} />
            <BatchScheduleOptions
              value={stagger}
              onChange={setStagger}
              itemCount={itemCount}
              accountCount={accountIds.length}
              baseDate={scheduledFor}
              disabled={saving}
            />
          </section>

          <div className={`sf-batch-summary${totalPosts > limits.maxPosts ? ' is-over' : ''}`}>
            <strong>
              {itemCount} mídia{itemCount === 1 ? '' : 's'} × {accountIds.length} perfi
              {accountIds.length === 1 ? 'l' : 's'} = {totalPosts} post{totalPosts === 1 ? '' : 's'}
            </strong>
            {totalPosts > limits.maxPosts && <span> (máximo {limits.maxPosts})</span>}
          </div>

          <div className="sf-post-editor__submit">
            <button
              type="button"
              className="sf-button sf-button--secondary"
              onClick={() => submit(false)}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar como rascunhos'}
            </button>
            <button
              type="button"
              className="sf-button sf-button--primary"
              onClick={() => submit(true)}
              disabled={saving || !scheduledFor}
              title={!scheduledFor ? 'Escolha uma data no campo "Agendar para" acima' : undefined}
            >
              {saving
                ? 'Salvando...'
                : totalPosts > 0
                ? `Agendar ${totalPosts} post${totalPosts === 1 ? '' : 's'}`
                : 'Agendar posts'}
            </button>
          </div>
        </div>
      </DashboardCard>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </>
  );
}