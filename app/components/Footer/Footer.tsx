import React from 'react';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaWeixin, FaPaperPlane, FaQq } from 'react-icons/fa';
import { getAllSettings } from '@/lib/data/settings';
import type { SocialLink } from '@/lib/data/settings';

// 图标标识 → react-icons 组件映射
const ICON_MAP: Record<string, React.ElementType> = {
  facebook: FaFacebook,
  twitter: FaTwitter,
  instagram: FaInstagram,
  weixin: FaWeixin,
  wechat: FaWeixin,
  telegram: FaPaperPlane,
  qq: FaQq,
};

interface SocialInfo {
  icon: React.ElementType;
  link: string;
  qrCode?: string;
  info?: string;
}

function resolveSocialInfo(s: SocialLink): SocialInfo | null {
  const Icon = ICON_MAP[s.icon] || ICON_MAP[s.platform];
  if (!Icon) return null;
  return {
    icon: Icon,
    link: s.link,
    qrCode: s.qr_code || undefined,
    info: s.info,
  };
}

const Footer: React.FC = async () => {
  // 服务端读取站点配置
  let socialInfos: SocialInfo[] = [];
  let copyrightText = '资源桶. 保留所有权利.';
  let yearStart = new Date().getFullYear();
  try {
    const settings = await getAllSettings();
    const raw = settings.social_links;
    if (Array.isArray(raw)) {
      socialInfos = raw
        .map((r) => resolveSocialInfo(r as SocialLink))
        .filter((x): x is SocialInfo => x !== null);
    }
    if (typeof settings.copyright_text === 'string' && settings.copyright_text) {
      copyrightText = settings.copyright_text;
    }
    if (typeof settings.copyright_year_start === 'number') {
      yearStart = settings.copyright_year_start;
    }
  } catch (e) {
    // 读取失败保持默认值
    console.error('Footer 读取站点配置失败:', e);
  }

  const currentYear = new Date().getFullYear();
  const yearDisplay = yearStart < currentYear ? `${yearStart}-${currentYear}` : `${currentYear}`;

  return (
    <footer className="bg-gt-background py-6 border-t border-gt-border">
      <div className="max-w-[1400px] mx-auto px-6 flex flex-col items-center max-[768px]:px-4 max-[576px]:px-3">
        <div className="flex gap-4 mt-3 max-[576px]:gap-3 max-[400px]:gap-2 max-[360px]:flex-wrap max-[360px]:justify-center">
          {socialInfos.map((info, index) => (
            <div key={index} className="group relative inline-block">
              <a href={info.link} target="_blank" rel="noopener noreferrer" className="text-xl text-gt-muted-foreground transition-colors duration-300 hover:text-gt-secondary max-[576px]:text-lg max-[400px]:text-base">
                <info.icon />
              </a>
              <a
                href={info.qrCode}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-[120%] left-1/2 -translate-x-1/2 bg-gt-card border border-gt-border rounded-gt p-4 z-10 whitespace-nowrap w-[250px] text-gt-foreground text-base text-center font-gt invisible opacity-0 transition-opacity duration-300 group-hover:visible group-hover:opacity-100 after:content-[''] after:absolute after:top-full after:left-1/2 after:-ml-[5px] after:border-[5px] after:border-solid after:border-t-gt-border after:border-x-transparent after:border-b-transparent"
              >
                <h3 className="text-base mb-2 font-semibold">{info.info}</h3>
                {info.qrCode && (
                  <Image
                    className="w-[200px] h-[200px] mx-auto block rounded-gt"
                    src={info.qrCode}
                    alt="QR Code"
                    width={100}
                    height={100}
                  />
                )}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-3 text-gt-muted-foreground text-[0.8125rem] font-gt tracking-gt max-[576px]:text-xs max-[400px]:text-[0.6875rem] text-center">
          © {yearDisplay} {copyrightText}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
