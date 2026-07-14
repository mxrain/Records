import Header from '@/app/components/Header';

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      {children}
    </div>
  );
}
