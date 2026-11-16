import { db, addDoc, collection, doc, onSnapshot, updateDoc, writeBatch } from './firebase.js';
import { esc, err, toast, track } from './common.js?v=11';

const BOARD_WIDTH = 5000;
const BOARD_HEIGHT = 4000;
const IMAGE_LIMIT = 450 * 1024;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const numeric = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function pointsPath(points) {
    const safe = (Array.isArray(points) ? points : []).map(point => ({
        x: clamp(numeric(point?.x), 0, BOARD_WIDTH),
        y: clamp(numeric(point?.y), 0, BOARD_HEIGHT)
    }));
    return safe.length ? safe.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ') : ''
}

function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(blob)
    })
}

async function compressImage(blob) {
    if (!blob?.type?.startsWith('image/')) throw new Error('O conteúdo copiado não é uma imagem.');
    const image = await createImageBitmap(blob);
    try {
        let scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        let quality = .76;
        while (scale >= .2) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            const compressed = await new Promise((resolve, reject) => {
                canvas.toBlob(result => result ? resolve(result) : reject(new Error('Não foi possível comprimir a imagem.')), 'image/webp', quality)
            });
            if (compressed.size <= IMAGE_LIMIT) return {
                data: await readDataUrl(compressed),
                width: canvas.width,
                height: canvas.height
            };
            scale *= .75;
            quality = Math.max(.5, quality - .05)
        }
        throw new Error('A imagem é grande demais para ser salva no quadro.')
    } finally {
        image.close()
    }
}

export class InvestigationBoard {
    constructor(campaignId, audience = 'master') {
        this.audience = audience;
        this.items = [];
        this.root = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.cameraReady = false;
        this.pendingFrom = '';
        this.drawMode = false;
        this.gesture = null;
        this.activePointers = new Map();
        this.contextMenu = null;
        this.saveTimers = new Map();
        this.draft = '';
        this.pending = false;
        this.vq = 0;
        const collectionName = audience === 'players' ? 'playerInvestigation' : 'investigation';
        this.ref = collection(db, 'campaigns', campaignId, collectionName);
        this.handlers = {
            click: event => this.handleClick(event),
            input: event => this.handleInput(event),
            focusout: event => this.handleFocusOut(event),
            contextmenu: event => this.handleContextMenu(event),
            paste: event => this.handlePaste(event),
            pointerdown: event => this.handlePointerDown(event),
            pointermove: event => this.handlePointerMove(event),
            pointerup: event => this.handlePointerUp(event),
            pointercancel: event => this.handlePointerCancel(event),
            wheel: event => this.handleWheel(event),
            keydown: event => this.handleKeydown(event)
        };
        this.handleDocumentClick = event => {
            if (this.contextMenu && !this.contextMenu.contains(event.target)) {
                this.contextMenu.remove();
                this.contextMenu = null
            }
        };
        this.handleDocumentKeydown = event => {
            if (event.key !== 'Escape') return;
            if (this.contextMenu) {
                this.contextMenu.remove();
                this.contextMenu = null
            }
            if (this.pendingFrom) {
                this.pendingFrom = '';
                this.setStatus('Conexão cancelada.')
            }
        };
        track(document, 'click', this.handleDocumentClick);
        track(document, 'keydown', this.handleDocumentKeydown);
        this.unsubscribe = onSnapshot(this.ref, snapshot => {
            this.items = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
            if (this.gesture) { this.pending = true; return }   // não quebra um arraste em andamento
            this.render()
        }, error => toast(err(error), 1))
    }

    attach(root) {
        if (!root) return;
        if (this.root !== root) {
            if (this.root) this.unbind(this.root);
            this.root = root;
            Object.entries(this.handlers).forEach(([name, handler]) => root.addEventListener(name, handler, name === 'wheel' ? { passive: false } : false))
        }
        this.render()
    }

    unbind(root) {
        Object.entries(this.handlers).forEach(([name, handler]) => root.removeEventListener(name, handler))
    }

    get viewport() {
        return this.root?.querySelector('.investigation-viewport')
    }

    render() {
        if (!this.root?.isConnected) return;
        this.contextMenu = null;
        const dr0 = this.root.querySelector('[data-board-draft]');
        if (dr0) this.draft = dr0.value;
        const draftFocus = !!dr0 && document.activeElement === dr0;
        const activeInput = document.activeElement?.closest('[data-board-edit]');
        const focusId = activeInput && this.root.contains(activeInput) ? activeInput.dataset.boardEdit : '';
        const selection = activeInput ? [activeInput.selectionStart, activeInput.selectionEnd] : null;
        this.root.innerHTML = `<div class=investigation-layout>
  <aside class="investigation-tools pn">
   <h3>${this.audience === 'players' ? 'Quadro compartilhado' : 'Elementos'}</h3>
   <label class=board-tool-label for=board-note-draft>Escrever</label>
   <textarea id=board-note-draft data-board-draft placeholder="Escreva uma anotação..."></textarea>
   <button type=button class=g data-board-action=note>Adicionar ao quadro</button>
   <div class=board-tool-group>
    <button type=button class=g data-board-action=paste>Colar imagem</button>
    <small>Também é possível usar Ctrl+V no quadro.</small>
   </div>
   <button type=button class="g board-draw-toggle ${this.drawMode ? 'on' : ''}" data-board-action=draw aria-pressed="${this.drawMode}">${this.drawMode ? 'Concluir desenho' : 'Desenhar'}</button>
   <div class=board-zoom-controls>
    <button type=button class=g data-board-action=zoom-out aria-label="Diminuir zoom">−</button>
    <span data-board-zoom>${Math.round(this.zoom * 100)}%</span>
    <button type=button class=g data-board-action=zoom-in aria-label="Aumentar zoom">+</button>
    <button type=button class=g data-board-action=reset-view>Centralizar</button>
   </div>
   <p class=hint>Para conectar, clique no ponto central que aparece ao passar o mouse sobre um elemento.</p>
   <p class=hint data-board-status>${this.pendingFrom ? 'Clique em outro elemento para criar uma conexão.' : 'Arraste para mover o quadro; use a pinça ou a roda do mouse para dar zoom.'}</p>
  </aside>
  <div class=investigation-viewport tabindex=0 aria-label="Quadro de investigação">
   <div class=investigation-world style="width:${BOARD_WIDTH}px;height:${BOARD_HEIGHT}px;transform:translate(${this.panX}px,${this.panY}px) scale(${this.zoom})">
    ${this.renderVectors()}
    ${this.items.filter(item => item.type === 'note' || item.type === 'image').map(item => this.renderItem(item)).join('')}
   </div>
   ${this.gesture?.kind === 'pan' ? '<span class=board-pan-indicator>Movendo quadro</span>' : ''}
  </div>
 </div>`;
        const nd = this.root.querySelector('[data-board-draft]');
        if (nd) { nd.value = this.draft; if (draftFocus) nd.focus({ preventScroll: true }) }
        if (!this.cameraReady) {
            requestAnimationFrame(() => {
                if (!this.root?.isConnected || !this.viewport) return;
                const viewport = this.viewport;
                this.panX = (viewport.clientWidth - BOARD_WIDTH * this.zoom) / 2;
                this.panY = (viewport.clientHeight - BOARD_HEIGHT * this.zoom) / 2;
                this.cameraReady = true;
                this.applyCamera()
            })
        } else this.applyCamera();
        if (focusId) {
            const input = [...this.root.querySelectorAll('[data-board-edit]')].find(element => element.dataset.boardEdit === focusId);
            if (input) {
                input.focus({ preventScroll: true });
                if (selection) input.setSelectionRange(...selection)
            }
        }
    }

    renderVectors() {
        const nodes = new Map(this.items.filter(item => ['note', 'image', 'drawing'].includes(item.type)).map(item => [item.id, item]));
        const connections = this.items.filter(item => item.type === 'connection').map(item => {
            const from = nodes.get(item.from), to = nodes.get(item.to);
            if (!from || !to) return '';
            const x1 = numeric(from.x) + numeric(from.width, 250) / 2;
            const y1 = numeric(from.y) + numeric(from.height, 160) / 2;
            const x2 = numeric(to.x) + numeric(to.width, 250) / 2;
            const y2 = numeric(to.y) + numeric(to.height, 160) / 2;
            return `<line data-board-connection="${esc(item.id)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
        }).join('');
        const drawings = this.items.filter(item => item.type === 'drawing').map(item => {
            const transform = `translate(${numeric(item.x)},${numeric(item.y)})`;
            const path = pointsPath(item.points);
            const width = numeric(item.width, 16), height = numeric(item.height, 16);
            return `<g class=board-drawing-group transform="${transform}"><rect class=board-drawing-hitbox data-board-node="${esc(item.id)}" data-board-drag width="${width}" height="${height}"/><path class=board-drawing-visible d="${path}"/><circle class=board-connect-point-svg data-board-node="${esc(item.id)}" data-board-connect="${esc(item.id)}" cx="${width / 2}" cy="${height / 2}" r=7 role=button tabindex=0 aria-label="Conectar desenho"/></g>`
        }).join('');
        return `<svg class=investigation-vectors viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" aria-label="Linhas e desenhos do quadro">
   <g class=board-connections>${connections}</g><g class=board-drawings>${drawings}</g>
   ${this.gesture?.kind === 'draw' ? `<path data-live-stroke d="${pointsPath(this.gesture.points)}"/>` : ''}
  </svg>`
    }

    renderItem(item) {
        const width = clamp(numeric(item.width, 250), 160, 600);
        const height = clamp(numeric(item.height, 160), 100, 600);
        const body = item.type === 'image'
            ? `<img class=board-image src="${esc(item.image || '')}" alt="Imagem colada no quadro" draggable=false>`
            : `<textarea class=board-note data-board-edit="${esc(item.id)}" aria-label="Texto da anotação">${esc(item.text || '')}</textarea>`;
        return `<article class="investigation-item board-item-${item.type}" data-board-node="${esc(item.id)}" style="left:${numeric(item.x)}px;top:${numeric(item.y)}px;width:${width}px;height:${height}px">
   <div class=board-item-head data-board-drag><span>${item.type === 'image' ? 'Imagem' : 'Anotação'}</span><small>arraste</small></div>
   <div class=board-item-body>${body}</div>
   <button type=button class=board-connect-point data-board-connect="${esc(item.id)}" aria-label="Conectar elemento" title="Conectar"></button>
  </article>`
    }

    applyCamera() {
        const world = this.root?.querySelector('.investigation-world');
        if (!world) return;
        world.style.transform = `translate(${this.panX}px,${this.panY}px) scale(${this.zoom})`;
        const zoomLabel = this.root.querySelector('[data-board-zoom]');
        if (zoomLabel) zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`
    }

    worldPoint(clientX, clientY) {
        const rect = this.viewport.getBoundingClientRect();
        return {
            x: clamp((clientX - rect.left - this.panX) / this.zoom, 0, BOARD_WIDTH),
            y: clamp((clientY - rect.top - this.panY) / this.zoom, 0, BOARD_HEIGHT)
        }
    }

    centerPosition(width, height) {
        const viewport = this.viewport;
        const rect = viewport.getBoundingClientRect();
        const center = this.worldPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
            x: clamp(center.x - width / 2, 0, BOARD_WIDTH - width),
            y: clamp(center.y - height / 2, 0, BOARD_HEIGHT - height)
        }
    }

    setZoom(nextZoom, clientX, clientY) {
        const viewport = this.viewport;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const anchorX = clientX ?? rect.left + rect.width / 2;
        const anchorY = clientY ?? rect.top + rect.height / 2;
        const point = this.worldPoint(anchorX, anchorY);
        this.zoom = clamp(nextZoom, .25, 2.5);
        this.panX = anchorX - rect.left - point.x * this.zoom;
        this.panY = anchorY - rect.top - point.y * this.zoom;
        this.applyCamera()
    }

    setStatus(message) {
        const status = this.root?.querySelector('[data-board-status]');
        if (status) status.textContent = message
    }

    async addNote() {
        const text = this.root.querySelector('[data-board-draft]').value.trim();
        if (!text) return toast('Escreva uma anotação antes de adicionar.', 1);
        const width = 250, height = 170, position = this.centerPosition(width, height);
        await addDoc(this.ref, { type: 'note', text, width, height, ...position });
        const draft = this.root?.querySelector('[data-board-draft]');
        this.draft = '';
        if (draft) draft.value = ''
    }

    async addImage(blob) {
        const compressed = await compressImage(blob);
        const width = 280, height = clamp(280 * compressed.height / compressed.width, 140, 320);
        const position = this.centerPosition(width, height);
        await addDoc(this.ref, { type: 'image', image: compressed.data, width, height, ...position })
    }

    async pasteImage() {
        if (!navigator.clipboard?.read) {
            this.viewport?.focus();
            return toast('Use Ctrl+V com o quadro selecionado para colar uma imagem.', 1)
        }
        try {
            const clipboardItems = await navigator.clipboard.read();
            const images = [];
            for (const item of clipboardItems) {
                const type = item.types.find(value => value.startsWith('image/'));
                if (type) images.push(await item.getType(type))
            }
            if (!images.length) return toast('Nenhuma imagem encontrada na área de transferência.', 1);
            for (const image of images) await this.addImage(image)
        } catch (error) {
            toast(`Não foi possível ler a imagem. Tente Ctrl+V no quadro. ${err(error)}`, 1)
        }
    }

    async handleClick(event) {
        if (this.contextMenu && !this.contextMenu.contains(event.target)) {
            this.contextMenu.remove();
            this.contextMenu = null
        }
        const action = event.target.closest('[data-board-action]')?.dataset.boardAction;
        if (action) {
            try {
                if (action === 'note') await this.addNote();
                else if (action === 'paste') await this.pasteImage();
                else if (action === 'delete-item') {
                    const button = event.target.closest('[data-board-action]');
                    this.contextMenu?.remove(); this.contextMenu = null;
                    const item = this.items.find(value => value.id === button.dataset.item);
                    if (!item || !confirm(button.dataset.connection === 'true'
                        ? 'Apagar esta conexão?'
                        : 'Apagar este elemento e as conexões ligadas a ele?')) return;
                    await this.deleteItem(button.dataset.item, button.dataset.connection === 'true')
                }
                else if (action === 'draw') {
                    this.drawMode = !this.drawMode;
                    this.render()
                } else if (action === 'zoom-in') this.setZoom(this.zoom * 1.2);
                else if (action === 'zoom-out') this.setZoom(this.zoom / 1.2);
                else if (action === 'reset-view') {
                    this.zoom = 1;
                    const viewport = this.viewport;
                    this.panX = (viewport.clientWidth - BOARD_WIDTH) / 2;
                    this.panY = (viewport.clientHeight - BOARD_HEIGHT) / 2;
                    this.cameraReady = true;
                    this.applyCamera()
                }
            } catch (error) {
                toast(err(error), 1)
            }
            return
        }
        const connector = event.target.closest('[data-board-connect]');
        if (!connector) return;
        const to = connector.dataset.boardConnect;
        if (!this.pendingFrom) {
            this.pendingFrom = to;
            this.setStatus('Ponto de partida selecionado. Clique no ponto central de outro elemento.');
            return
        }
        if (to === this.pendingFrom) {
            this.pendingFrom = '';
            this.setStatus('Conexão cancelada.');
            return
        }
        const from = this.pendingFrom;
        this.pendingFrom = '';
        this.setStatus('Salvando conexão...');
        try {
            await addDoc(this.ref, { type: 'connection', from, to });
            this.setStatus('Conexão criada. Clique nos pontos centrais para adicionar mais.')
        } catch (error) {
            this.pendingFrom = from;
            this.setStatus('Não foi possível criar a conexão.');
            toast(err(error), 1)
        }
    }

    handleInput(event) {
        if (event.target.matches?.('[data-board-draft]')) { this.draft = event.target.value; return }
        const input = event.target.closest('[data-board-edit]');
        if (!input) return;
        const item = this.items.find(value => value.id === input.dataset.boardEdit);
        if (item) item.text = input.value;
        clearTimeout(this.saveTimers.get(input.dataset.boardEdit));
        this.saveTimers.set(input.dataset.boardEdit, setTimeout(() => this.saveText(input.dataset.boardEdit, input.value), 500))
    }

    handleFocusOut(event) {
        const input = event.target.closest('[data-board-edit]');
        if (!input) return;
        clearTimeout(this.saveTimers.get(input.dataset.boardEdit));
        this.saveText(input.dataset.boardEdit, input.value)
    }

    saveText(id, text) {
        this.saveTimers.delete(id);
        updateDoc(doc(this.ref, id), { text }).catch(error => toast(err(error), 1))
    }

    handleContextMenu(event) {
        const node = event.target.closest('[data-board-node]');
        const connection = event.target.closest('[data-board-connection]');
        if (!node && !connection) return;
        event.preventDefault();
        this.openContextMenu(event, node?.dataset.boardNode || connection.dataset.boardConnection, Boolean(connection))
    }

    handleKeydown(event) {
        const connector = event.target.closest('[data-board-connect]');
        if (!connector || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        connector.click()
    }

    openContextMenu(event, itemId, isConnection) {
        this.contextMenu?.remove();
        const menu = document.createElement('div'), button = document.createElement('button');
        menu.className = 'ctx-menu';
        menu.setAttribute('role', 'menu');
        button.type = 'button';
        button.setAttribute('role', 'menuitem');
        button.dataset.boardAction = 'delete-item';
        button.dataset.item = itemId;
        button.dataset.connection = String(isConnection);
        button.textContent = isConnection ? 'Apagar conexão' : 'Apagar elemento';
        menu.append(button);
        this.root.append(menu);
        this.contextMenu = menu;
        const rect = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - rect.width - 8))}px`;
        menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - rect.height - 8))}px`
    }

    async deleteItem(id, isConnection) {
        const item = this.items.find(value => value.id === id);
        if (!item) return;
        const toDelete = isConnection
            ? [item]
            : [item, ...this.items.filter(value => value.type === 'connection' && (value.from === id || value.to === id))];
        for (let i = 0; i < toDelete.length; i += 450) {
            const batch = writeBatch(db);
            toDelete.slice(i, i + 450).forEach(value => batch.delete(doc(this.ref, value.id)));
            await batch.commit()
        }
        toast(isConnection ? 'Conexão apagada.' : 'Elemento apagado.')
    }

    handlePaste(event) {
        const images = [...(event.clipboardData?.items || [])]
            .filter(item => item.type.startsWith('image/'))
            .map(item => item.getAsFile())
            .filter(Boolean);
        if (!images.length) return;
        event.preventDefault();
        images.reduce((promise, image) => promise.then(() => this.addImage(image)), Promise.resolve())
            .catch(error => toast(err(error), 1))
    }

    handlePointerDown(event) {
        const viewport = event.target.closest('.investigation-viewport');
        if (!viewport || (event.button !== 0 && event.button !== 1)) return;
        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.activePointers.size > 1) {
            if (this.activePointers.size === 2 && (!this.gesture || ['pan', 'draw', 'node'].includes(this.gesture.kind))) {
                if (this.gesture?.kind === 'node') {
                    const dragged = this.gesture;
                    updateDoc(doc(this.ref, dragged.id), { x: dragged.x, y: dragged.y })
                        .catch(error => toast(err(error), 1))
                }
                const pointerIds = [...this.activePointers.keys()];
                const [first, second] = pointerIds.map(id => this.activePointers.get(id));
                const centerX = (first.x + second.x) / 2, centerY = (first.y + second.y) / 2;
                this.gesture = {
                    kind: 'pinch', pointerIds,
                    startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
                    startZoom: this.zoom,
                    world: this.worldPoint(centerX, centerY)
                };
                pointerIds.forEach(id => viewport.setPointerCapture(id));
                viewport.classList.remove('is-panning');
                this.renderVectorsIntoWorld();
                event.preventDefault();
                return
            }
            this.activePointers.delete(event.pointerId);
            return
        }
        if (event.target.closest('[data-board-connect]')) return;
        const point = this.worldPoint(event.clientX, event.clientY);
        if (this.drawMode && event.button === 0) {
            event.preventDefault();
            this.gesture = { kind: 'draw', pointerId: event.pointerId, points: [point] };
            viewport.setPointerCapture(event.pointerId);
            this.renderVectorsIntoWorld();
            return
        }
        if (event.button === 0 && this.pendingFrom) return;
        const drag = event.button === 0 && event.target.closest('[data-board-drag]');
        if (drag) {
            const node = drag.closest('[data-board-node]');
            const item = this.items.find(value => value.id === node?.dataset.boardNode);
            if (!item) return;
            event.preventDefault();
            this.gesture = {
                kind: 'node', pointerId: event.pointerId, id: item.id,
                startX: event.clientX, startY: event.clientY,
                startItemX: numeric(item.x), startItemY: numeric(item.y),
                x: numeric(item.x), y: numeric(item.y),
                width: numeric(item.width, 250), height: numeric(item.height, 160)
            };
            viewport.setPointerCapture(event.pointerId);
            return
        }
        if (event.target.closest('[data-board-node]')) return;
        event.preventDefault();
        this.gesture = { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: this.panX, panY: this.panY };
        viewport.classList.add('is-panning');
        viewport.setPointerCapture(event.pointerId)
    }

    handlePointerMove(event) {
        const gesture = this.gesture;
        if (this.activePointers.has(event.pointerId)) this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (gesture?.kind === 'pinch') {
            if (!gesture.pointerIds.includes(event.pointerId)) return;
            const [first, second] = gesture.pointerIds.map(id => this.activePointers.get(id));
            if (!first || !second) return;
            const centerX = (first.x + second.x) / 2, centerY = (first.y + second.y) / 2;
            const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
            const viewport = this.viewport, rect = viewport.getBoundingClientRect();
            this.zoom = clamp(gesture.startZoom * distance / gesture.startDistance, .25, 2.5);
            this.panX = centerX - rect.left - gesture.world.x * this.zoom;
            this.panY = centerY - rect.top - gesture.world.y * this.zoom;
            this.applyCamera();
            event.preventDefault();
            return
        }
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        if (gesture.kind === 'pan') {
            this.panX = gesture.panX + event.clientX - gesture.startX;
            this.panY = gesture.panY + event.clientY - gesture.startY;
            this.applyCamera()
        } else if (gesture.kind === 'node') {
            const x = clamp(gesture.startItemX + (event.clientX - gesture.startX) / this.zoom, 0, BOARD_WIDTH - gesture.width);
            const y = clamp(gesture.startItemY + (event.clientY - gesture.startY) / this.zoom, 0, BOARD_HEIGHT - gesture.height);
            const node = [...this.root.querySelectorAll('[data-board-node]')].find(element => element.dataset.boardNode === gesture.id);
            if (node && node.namespaceURI !== 'http://www.w3.org/2000/svg') { node.style.left = `${x}px`; node.style.top = `${y}px` }
            const item = this.items.find(value => value.id === gesture.id);
            if (item) { item.x = x; item.y = y }
            this.queueVectors();
            gesture.x = x; gesture.y = y
        } else if (gesture.kind === 'draw') {
            const point = this.worldPoint(event.clientX, event.clientY);
            const previous = gesture.points[gesture.points.length - 1];
            if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 2) gesture.points.push(point);
            this.queueVectors()
        }
    }

    async handlePointerUp(event) {
        if (this.activePointers.has(event.pointerId)) this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.activePointers.delete(event.pointerId);
        const gesture = this.gesture;
        if (gesture?.kind === 'pinch') {
            const remaining = this.activePointers.entries().next().value;
            this.gesture = remaining ? {
                kind: 'pan', pointerId: remaining[0],
                startX: remaining[1].x, startY: remaining[1].y,
                panX: this.panX, panY: this.panY
            } : null;
            this.viewport?.classList.toggle('is-panning', Boolean(remaining));
            this.renderVectorsIntoWorld();
            return
        }
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        this.gesture = null;
        this.viewport?.classList.remove('is-panning');
        this.renderVectorsIntoWorld();
        setTimeout(() => { if (this.pending && !this.gesture) { this.pending = false; this.render() } }, 0);
        if (gesture.kind === 'node') {
            const item = this.items.find(value => value.id === gesture.id);
            if (item) { item.x = gesture.x; item.y = gesture.y }
            try {
                await updateDoc(doc(this.ref, gesture.id), { x: gesture.x, y: gesture.y })
            } catch (error) {
                toast(err(error), 1)
            }
        } else if (gesture.kind === 'draw' && gesture.points.length > 1) {
            try {
                const step = Math.ceil(gesture.points.length / 2000);
                const sampled = gesture.points.filter((point, index) => index % step === 0);
                const last = gesture.points[gesture.points.length - 1];
                if (sampled[sampled.length - 1] !== last) sampled.push(last);
                const minX = clamp(Math.min(...sampled.map(point => point.x)) - 8, 0, BOARD_WIDTH - 16);
                const minY = clamp(Math.min(...sampled.map(point => point.y)) - 8, 0, BOARD_HEIGHT - 16);
                const maxX = clamp(Math.max(...sampled.map(point => point.x)) + 8, minX + 16, BOARD_WIDTH);
                const maxY = clamp(Math.max(...sampled.map(point => point.y)) + 8, minY + 16, BOARD_HEIGHT);
                const width = Math.max(16, maxX - minX), height = Math.max(16, maxY - minY);
                const points = sampled.map(point => ({ x: point.x - minX, y: point.y - minY }));
                await addDoc(this.ref, { type: 'drawing', x: minX, y: minY, width, height, points })
            } catch (error) {
                toast(err(error), 1)
            }
        }
    }

    handlePointerCancel(event) {
        this.activePointers.delete(event.pointerId);
        if (this.gesture?.kind === 'pinch') {
            const remaining = this.activePointers.entries().next().value;
            this.gesture = remaining ? {
                kind: 'pan', pointerId: remaining[0],
                startX: remaining[1].x, startY: remaining[1].y,
                panX: this.panX, panY: this.panY
            } : null;
            this.viewport?.classList.toggle('is-panning', Boolean(remaining));
            return
        }
        if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
        if (this.gesture.kind === 'node') {
            const item = this.items.find(value => value.id === this.gesture.id);
            if (item) { item.x = this.gesture.startItemX; item.y = this.gesture.startItemY }
            const node = [...this.root.querySelectorAll('[data-board-node]')].find(element => element.dataset.boardNode === this.gesture.id);
            if (node && node.namespaceURI !== 'http://www.w3.org/2000/svg') {
                node.style.left = `${this.gesture.startItemX}px`;
                node.style.top = `${this.gesture.startItemY}px`
            }
        }
        this.gesture = null;
        this.viewport?.classList.remove('is-panning');
        this.renderVectorsIntoWorld();
        setTimeout(() => { if (this.pending && !this.gesture) { this.pending = false; this.render() } }, 0)
    }

    /* no máximo um redesenho das linhas por quadro de animação (arrastar fica fluido) */
    queueVectors() {
        if (this.vq) return;
        this.vq = requestAnimationFrame(() => { this.vq = 0; this.renderVectorsIntoWorld() })
    }

    renderVectorsIntoWorld() {
        const world = this.root?.querySelector('.investigation-world');
        const vectors = world?.querySelector('.investigation-vectors');
        if (!vectors) return;
        vectors.outerHTML = this.renderVectors()
    }

    handleWheel(event) {
        if (!event.target.closest('.investigation-viewport')) return;
        event.preventDefault();
        this.setZoom(this.zoom * Math.exp(-event.deltaY * .001), event.clientX, event.clientY)
    }
}
