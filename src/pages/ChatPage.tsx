import { useEffect, useRef, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { parseMessage } from '../lib/parser';
import { formatEntryLine, formatTimeThai } from '../lib/format';
import { EntryEditForm } from '../components/EntryEditForm';
import type { Entry } from '../types';

export function ChatPage() {
  const { entries, names, selfKey, addEntry, editEntry, deleteEntry } = useRoom();
  const [input, setInput] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [lastLocalEntryId, setLastLocalEntryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length, pendingQuestion]);

  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const result = parseMessage(text, { names, selfKey, now: new Date() });
    if (!result.ok) {
      setPendingQuestion(result.question);
      setInput('');
      inputRef.current?.focus();
      return;
    }

    setSending(true);
    try {
      const entry = await addEntry(result.entry);
      setLastLocalEntryId(entry.id);
      setPendingQuestion(null);
      setInput('');
    } catch (err) {
      setPendingQuestion(err instanceof Error ? `บันทึกไม่สำเร็จ: ${err.message}` : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const renderBubble = (entry: Entry) => {
    const isSelf = entry.payer === selfKey;
    const isLast = entry.id === lastLocalEntryId;

    if (editingId === entry.id) {
      return (
        <div key={entry.id} className="mb-3">
          <EntryEditForm
            entry={entry}
            names={names}
            onSave={async (patch) => {
              await editEntry(entry.id, patch);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      );
    }

    return (
      <div key={entry.id} className={`mb-3 flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
            isSelf ? 'bg-brand-500 text-white' : 'bg-white text-gray-700'
          }`}
        >
          {formatEntryLine(entry, names)}
        </div>
        <div className="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-gray-400">
          <span>{formatTimeThai(entry.createdAt)}</span>
          {isLast && (
            <>
              <button onClick={() => setEditingId(entry.id)} className="underline">
                แก้ไข
              </button>
              <button
                onClick={async () => {
                  await deleteEntry(entry.id);
                  setLastLocalEntryId(null);
                }}
                className="underline"
              >
                ยกเลิก
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-3 pt-3">
        {sorted.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-400">
            พิมพ์รายการแรกได้เลย เช่น "ส้มตำ 60"
          </p>
        )}
        {sorted.map(renderBubble)}
        {pendingQuestion && (
          <div className="mb-3 flex flex-col items-start">
            <button
              onClick={() => setPendingQuestion(null)}
              className="max-w-[85%] rounded-2xl bg-yellow-50 px-4 py-2 text-left text-sm text-yellow-800 shadow-sm"
            >
              🤔 {pendingQuestion}
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder='พิมพ์ เช่น "ส้มตำ 60"'
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  );
}
