import ApiKeysManager from '../api/ApiKeysManager';

export const metadata = {
  title: 'API Keys 管理',
};

export default function ApiKeysPage() {
  return (
    <main className="flex-grow overflow-y-auto" style={{ padding: '1.5rem 2rem' }}>
      <ApiKeysManager />
    </main>
  );
}
