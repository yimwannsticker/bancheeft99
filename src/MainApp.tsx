import { useState } from 'react';
import { BottomNav, type TabKey } from './components/BottomNav';
import { ShareLinkBanner } from './components/ShareLinkBanner';
import { ChatPage } from './pages/ChatPage';
import { TablePage } from './pages/TablePage';
import { SummaryPage } from './pages/SummaryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useRoom } from './context/RoomContext';

export function MainApp({ showShareBannerInitially }: { showShareBannerInitially: boolean }) {
  const { roomId } = useRoom();
  const [tab, setTab] = useState<TabKey>('chat');
  const [showBanner, setShowBanner] = useState(showShareBannerInitially);

  return (
    <div className="flex h-screen flex-col bg-brand-50">
      {showBanner && <ShareLinkBanner roomId={roomId} onDismiss={() => setShowBanner(false)} />}
      <div className="min-h-0 flex-1">
        {tab === 'chat' && <ChatPage />}
        {tab === 'table' && <TablePage />}
        {tab === 'summary' && <SummaryPage />}
        {tab === 'settings' && <SettingsPage />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
