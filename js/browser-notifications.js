import { collection, db, onSnapshot, query, where } from './firebase.js';
import { getProfile } from './profile.js';

function wasRecentlyNotified(uid, key) {
    const storageKey = `club-notified-${uid}`;
    try {
        const recent = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(recent) && recent.includes(key)) return true;
        const next = Array.isArray(recent) ? recent : [];
        localStorage.setItem(storageKey, JSON.stringify([...next.slice(-99), key]));
    } catch (error) {
        console.warn('Não foi possível evitar notificações duplicadas entre abas.', error)
    }
    return false
}

async function notify(uid, key, title, body, url) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || wasRecentlyNotified(uid, key)) return;
    try {
        const options = { body, icon: 'img/pwa-icon-192.png', tag: key, data: { url } };
        const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
        if (registration?.active) {
            await registration.showNotification(title, options);
            return
        }
        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            location.assign(url);
            notification.close()
        }
    } catch (error) {
        console.error('Não foi possível exibir a notificação do navegador.', error)
    }
}

export function watchBrowserNotifications(uid) {
    const watch = (name, notifyChange) => {
        let initialized = false;
        return onSnapshot(
            query(collection(db, name), where('to', '==', uid)),
            { includeMetadataChanges: true },
            snapshot => {
                if (!initialized) {
                    if (snapshot.metadata.fromCache) return;
                    initialized = true;
                    return
                }
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') notifyChange(change.doc.id, change.doc.data())
                })
            },
            error => console.error(`Não foi possível acompanhar ${name} para notificações.`, error)
        )
    };

    const requests = watch('friendRequests', (id, request) => {
        void getProfile(request.from).then(profile => {
            const sender = profile.username ? `@${profile.username}` : profile.displayName || 'Alguém';
            return notify(uid, `friend-${id}`, 'Novo pedido de amizade', `${sender} te enviou um pedido de amizade.`, 'perfil.html#amigos')
        })
    });
    const invites = watch('invites', (id, invite) => {
        void getProfile(invite.from).then(profile => {
            const sender = profile.username ? `@${profile.username}` : profile.displayName || 'Alguém';
            return notify(uid, `invite-${id}`, 'Novo convite de campanha', `${sender} te convidou para a campanha ${invite.campaignName || 'The Club'}.`, 'campanhas.html')
        })
    });

    return () => {
        requests();
        invites()
    }
}
