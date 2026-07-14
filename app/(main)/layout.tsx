import Header from '@/app/components/Header';
import TabComponent from '@/app/components/TabComponent/TabComponent';
import Footer from '@/app/components/Footer/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gt-background">
      <Header />
      <TabComponent />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </main>
      <Footer />
    </div>
  );
}
