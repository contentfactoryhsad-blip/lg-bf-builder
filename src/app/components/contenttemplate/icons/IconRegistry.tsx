import React from 'react';
import swP from './imports/SolidWhite/svg-10m93f0mvd';
import sbP from './imports/SolidBlack/svg-abfvlsx2t1';
import lwP from './imports/LineWhite/svg-fit17w4xkv';
import lbP from './imports/LineBlack/svg-3aqgu9v7n7';

export interface IconItem {
  id: string;
  label: string;
}

export const ICON_LIST: IconItem[] = [
  { id: '1-1-care',              label: '1:1 Care' },
  { id: '2-year-warranty',       label: '2-Year Warranty' },
  { id: 'coupon',                label: 'Coupon' },
  { id: 'delivery',              label: 'Delivery' },
  { id: 'discount',              label: 'Discount' },
  { id: 'disposal',              label: 'Disposal' },
  { id: 'event',                 label: 'Event' },
  { id: 'fast-delivery',         label: 'Fast Delivery' },
  { id: 'finance',               label: 'Finance' },
  { id: 'free-delivery',         label: 'Free Delivery' },
  { id: 'free-disposal',         label: 'Free Disposal' },
  { id: 'free-installation',     label: 'Free Installation' },
  { id: 'free-return',           label: 'Free Return' },
  { id: 'installation',          label: 'Installation' },
  { id: 'loyalty',               label: 'Loyalty' },
  { id: 'membership',            label: 'Membership' },
  { id: 'membership-coupon',     label: 'Membership Coupon' },
  { id: 'membership-event',      label: 'Membership Event' },
  { id: 'mileage',               label: 'Mileage' },
  { id: 'newsletter',            label: 'Newsletter' },
  { id: 'newsletter-coupon',     label: 'Newsletter Coupon' },
  { id: 'next-day-delivery',     label: 'Next-Day Delivery' },
  { id: 'obs-only',              label: 'OBS Only' },
  { id: 'percentage',            label: 'Percentage' },
  { id: 'point',                 label: 'Point' },
  { id: 'pre-order',             label: 'Pre-order' },
  { id: 'return',                label: 'Return' },
  { id: 'scheduled-delivery',    label: 'Scheduled Delivery' },
  { id: 'trade-in-program',      label: 'Trade-In Program' },
  { id: 'vip',                   label: 'VIP' },
  { id: 'vip-coupon',            label: 'VIP Coupon' },
  { id: 'vip-event',             label: 'VIP Event' },
  { id: 'vip-installation',      label: 'VIP Installation' },
  { id: 'warranty',              label: 'Warranty' },
  { id: 'welcome-coupon',        label: 'Welcome Coupon' },
  { id: 'zero-interest-payment', label: 'Zero-interest Payment' },
];

export function splitLabel(label: string): [string, string] {
  const idx = label.indexOf(' ');
  if (idx === -1) return [label, ''];
  return [label.slice(0, idx), label.slice(idx + 1)];
}

type Paths = Record<string, string>;
type Seg = { p: string; e?: 1; s?: 1 };
const p = (k: string): Seg => ({ p: k });
const pe = (k: string): Seg => ({ p: k, e: 1 });
const ps = (k: string): Seg => ({ p: k, s: 1 });

function segsToJsx(segs: Seg[], fill: string, file: Paths): React.ReactNode {
  return segs.map((seg, i) => (
    <path
      key={i}
      d={file[seg.p]}
      fill={fill}
      {...(seg.e ? { fillRule: 'evenodd' as const, clipRule: 'evenodd' as const } : {})}
      {...(seg.s ? { stroke: fill } : {})}
    />
  ));
}

export function IconSvg({
  iconId,
  style,
  size = 60,
}: {
  iconId: string;
  style: 'solid-white' | 'solid-black' | 'line-white' | 'line-black';
  size?: number;
}): React.ReactElement | null {
  const def = DEFS[iconId];
  if (!def) return null;

  let content: React.ReactNode;

  if (style === 'solid-white') {
    content = (
      <>
        <path d={swP.p21faa600} fill="white" opacity="0.8" />
        {segsToJsx(def.sw, 'black', swP)}
      </>
    );
  } else if (style === 'solid-black') {
    content = (
      <>
        <path d={sbP.p21faa600} fill="black" opacity="0.8" />
        {segsToJsx(def.sb, 'white', sbP)}
      </>
    );
  } else if (style === 'line-white') {
    content = segsToJsx(def.lw, 'white', lwP);
  } else {
    content = segsToJsx(def.lb, 'black', lbP);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {content}
    </svg>
  );
}

interface Def { sw: Seg[]; sb: Seg[]; lw: Seg[]; lb: Seg[] }

const DEFS: Record<string, Def> = {
  '1-1-care': {
    sw: [p('p2175f900')],
    sb: [p('p1e5f5600')],
    lw: [pe('p21fcde00')],
    lb: [pe('p21fcde00')],
  },
  '2-year-warranty': {
    sw: [p('p10e05300'), p('p1d0c59f0'), pe('p2074ef00'), pe('p3cab1f0'), p('p3157b280'), p('pc877c00')],
    sb: [p('p2e620480'), p('p5e86600'),  pe('p4e59880'),  pe('p1535a800'), p('p3157b280'), p('pc877c00')],
    lw: [p('p374ac700'), p('p2c6d0b00'), pe('p2a177580'), pe('p1baef280')],
    lb: [p('p374ac700'), p('p2e5df400'), pe('p37dfad00'), pe('pdb21100')],
  },
  'coupon': {
    sw: [p('p1a063f00'), p('p5245020'), pe('pf57d370')],
    sb: [p('p2f682700'), p('p1054f300'), pe('pf57d370')],
    lw: [p('p2a6ed380'), pe('p3330f4b0'), p('p3fe69100'), p('p30415100'), p('p1897fd70'), pe('ped2cd00'), p('p1af80940'), pe('p3dcac900')],
    lb: [p('p1a137b00'), pe('p15e91370'), p('pc46d480'),  p('p1c47e6f2'), p('p13728c00'), pe('p300fc2c0'), p('pdf21f00'),  pe('p3e6ec5c0')],
  },
  'delivery': {
    sw: [p('p2eb08300'), p('pff23d00'), p('p16c42b80'), p('p14ac9700'), p('p3bdc0400'), p('p3c352200')],
    sb: [p('p3ae49000'), p('pff23d00'), p('p1675200'),  p('p30a14280'), p('p3bdc0400'), p('p9cf3500')],
    lw: [ps('p3e8df500')],
    lb: [ps('p2ba25100')],
  },
  'discount': {
    sw: [p('p24bd4d00'), p('p10a55480'), pe('pf0cf000')],
    sb: [p('p28a0dc80'), p('p10a55480'), pe('p21685f00')],
    lw: [p('p1590540'), pe('p250a0f00'), pe('p2c410e00'), pe('p3eb5f580')],
    lb: [p('p7b9b380'), pe('p3a3c19f0'), pe('p7221180'),  pe('p26230c80')],
  },
  'disposal': {
    sw: [p('p3c34e700'), p('p216f7e00')],
    sb: [p('p371b7900'), p('p46ef600')],
    lw: [pe('p26bc4900')],
    lb: [pe('p328dcc70')],
  },
  'event': {
    sw: [pe('p2c2fc680'), p('p121ffef0'), p('p10223b00'), p('pa8ffc80')],
    sb: [pe('p2c2fc680'), p('p121ffef0'), p('p10223b00'), p('pa8ffc80')],
    lw: [pe('p4305600'), p('p3add5b80')],
    lb: [pe('pdffe600'), pe('p1e710b80')],
  },
  'fast-delivery': {
    sw: [p('p8ae7240'), p('p1ca74080'), p('p3d9de00'), p('p18564480'), p('p28074600'), p('p9375e80')],
    sb: [p('p3daff200'), p('p1ca74080'), p('p12c104f0'), p('p182a0080'), p('p2ff9bb70'), p('pd4e8470')],
    lw: [ps('p19faee80')],
    lb: [ps('p35c0d780')],
  },
  'finance': {
    sw: [pe('p1e2ff500')],
    sb: [pe('p39f980c0')],
    lw: [p('p27d10440'), pe('p8f1f800')],
    lb: [p('p1f03b700'), pe('p8f1f800')],
  },
  'free-delivery': {
    sw: [p('p2cec9c00'), p('p38810bf0'), p('p1ae66b00'), p('p191b5c00'), p('pfab8452'), pe('p15d6e020'), p('p21925700')],
    sb: [p('p2cec9c00'), p('p38810bf0'), p('p37ac5180'), p('p1343b800'), p('pfab8452'), pe('p15d6e020'), p('p21925700')],
    lw: [p('p1e13bf00'), pe('p11de8b80'), p('p36503a00'), p('p123ce570'), pe('p10d6ed80')],
    lb: [p('p1e13bf00'), pe('p1a1d8d80'), p('p36503a00'), p('p123ce570'), pe('p10d6ed80')],
  },
  'free-disposal': {
    sw: [p('p257dcf80'), pe('pc838f00'), p('p216f7e00')],
    sb: [p('p774cc00'),  pe('p1dde9170'), p('p46ef600')],
    lw: [p('p1391ca00'), pe('p2324f180'), p('p1a887980'), p('p2d088c80'), pe('p2c225500')],
    lb: [p('p1391ca00'), pe('p2324f180'), p('p1a887980'), p('p2d088c80'), pe('p310c4300')],
  },
  'free-installation': {
    sw: [p('pbe2b700'), p('p1c44e700'), pe('p371f300'),  p('p22ae9300')],
    sb: [p('pbe2b700'), p('p3f0e0f00'), pe('p1631bc00'), p('p22ae9300')],
    lw: [p('p1cb63900'), pe('p138db980'), p('p3bfcd200'), p('p3b610000'), pe('p232d0c00')],
    lb: [p('p1cb63900'), pe('p1296e00'),  p('p3bfcd200'), p('p3b610000'), pe('p1dd17b00')],
  },
  'free-return': {
    sw: [p('p2fa02180'), p('p3172740'), p('p34a5f80'), pe('pd1f9920'), p('p3c072b80'), p('p25cf57f0'), p('p2fe7c600'), p('p29803fc0')],
    sb: [p('p2fa02180'), p('p3172740'), p('p34a5f80'), pe('pd1f9920'), p('p3c072b80'), p('p25cf57f0'), p('p2e4f64f0'), p('p29803fc0')],
    lw: [p('p20d02600'), pe('p3dd2ce80'), p('p7aa7180'), p('p309e5280'), p('pa354e00'), p('p3e9ce700'), pe('p24217d00')],
    lb: [p('p3de82a80'), pe('p3dd2ce80'), p('p1ad462c0'), p('p8708600'),  p('pa354e00'), p('p16653f00'), pe('p3f9d900')],
  },
  'installation': {
    sw: [p('pbe2b700'), p('p1d2ee300'), p('p22ae9300')],
    sb: [p('pbe2b700'), p('p1d2ee300'), p('p2ef05c00')],
    lw: [pe('p1d6ee340')],
    lb: [pe('p1d5a7df0')],
  },
  'loyalty': {
    sw: [p('p1955fe00'), p('p2fdd9780'), p('p3e5ccf00'), p('p36c35380'), p('p27681a00'), p('p2009a680')],
    sb: [p('p1955fe00'), p('p2fdd9780'), p('p3e5ccf00'), p('p36c35380'), p('p27681a00'), p('p2009a680')],
    lw: [pe('pf975cb0')],
    lb: [pe('p17339cf0')],
  },
  'membership': {
    sw: [p('p5483e80'), p('p2bc41300')],
    sb: [p('p5483e80'), p('p2bc41300')],
    lw: [pe('pace980')],
    lb: [pe('p1cfdf000')],
  },
  'membership-coupon': {
    sw: [pe('p4ff6940')],
    sb: [pe('p4ff6940')],
    lw: [p('p26ca4740'), pe('pfb97180'), p('p3b01600'), p('p129dab00'), p('p36922300'), pe('p14e63500')],
    lb: [p('p26ca4740'), pe('pfb97180'), p('p3b01600'), p('p129dab00'), p('p36922300'), pe('p14e63500')],
  },
  'membership-event': {
    sw: [pe('p80b8970'), p('p121ffef0'), p('p10223b00'), p('pa8ffc80')],
    sb: [pe('p80b8970'), p('p121ffef0'), p('p10223b00'), p('pa8ffc80')],
    lw: [pe('p24c0a400'), pe('p3aed7700')],
    lb: [pe('p1fdcd680'), pe('p293a9d00')],
  },
  'mileage': {
    sw: [pe('p277bfe00')],
    sb: [pe('p277bfe00')],
    lw: [p('p3b9f5670'), pe('p134f0c00')],
    lb: [p('p3b9f5670'), pe('p3ad46b80')],
  },
  'newsletter': {
    sw: [p('p1af46e00'), p('p109d9c00'), p('pb323800'), pe('p19d6e700'), p('p2ba83f00'), p('p295d9f00')],
    sb: [p('p15903840'), p('p109d9c00'), p('pb323800'), pe('p3b9cbd00'), p('p2ba83f00'), p('p295d9f00')],
    lw: [p('pa20c000'),  p('p3aa61a40'), pe('p3372ce00')],
    lb: [p('p2af2fa00'), p('p3aa61a40'), pe('p37bf3071')],
  },
  'newsletter-coupon': {
    sw: [pe('p3eb6d500'), p('p33f97500'), p('p2cd0ae00'), p('p23996380'), pe('p38824880')],
    sb: [pe('p68c2280'),  p('p274ac880'), p('p2cd0ae00'), p('p2ec00fc0'), pe('p3aa54600')],
    lw: [p('p10776100'), p('p33648880'), p('p2b36ec00'), p('p285d3e70'), pe('p32ae1580'), p('p3165b200'), p('p1407f200'), pe('p124d5e80')],
    lb: [p('p1859ba00'), p('p165d8100'), p('p2f750600'), p('p7deb980'),  pe('p20065300'), p('p62f2350'),  p('p3625a600'), pe('p284c7700')],
  },
  'next-day-delivery': {
    sw: [p('p363eb7c0'), pe('p119bc700'), p('p1b664e00'), p('p3837d980'), p('p3e248700'), p('p2a038b00'), p('p600a400'), p('p295f2d80'), p('p2804e140')],
    sb: [p('p82be6f0'),  pe('p398c9680'), p('p39eb3900'), p('pc386e00'),  p('p30fc6e80'), p('p1ffbbc00'), p('p50466f0'), p('p295f2d80'), p('p2804e140')],
    lw: [pe('p1162ac00'), p('p3b21070'), p('p9f14500'),  pe('p2194df00'), pe('p2d597af0')],
    lb: [pe('p91ed180'),  p('p3b21070'), p('p37f9c500'), pe('p39c7c100'), pe('p1cd11500')],
  },
  'obs-only': {
    sw: [p('p1fd9ef80'), p('p244d9b00'), pe('p29a45580'), pe('p784ca00')],
    sb: [p('p1ca05f80'), p('p322c5280'), pe('p313fc0f0'), pe('p784ca00')],
    lw: [pe('p29aa7400'), p('p3e1e6b00'), p('p28077100'), p('p3aef6000'), pe('p1c317bf0'), p('p16d04a60'), p('p33c56600'), p('p300ef000'), pe('pd21f100'), p('p1a2b6500'), p('p4fac400')],
    lb: [pe('p2a0ddd80'), p('p1d8c9000'), p('p1000d480'), p('p2c087700'), pe('p108a3a00'), p('p252af700'), p('p31458af0'), p('p17203a80'), pe('p7e2cc0'),   p('p20577700'), p('p3d6de500')],
  },
  'percentage': {
    sw: [pe('p26835780'), p('p34e00080'), pe('pe3b3400')],
    sb: [pe('p26835780'), p('p34e00080'), pe('pe3b3400')],
    lw: [pe('p2f1ca680'), p('p3d6a180'), pe('p5da1e00')],
    lb: [pe('p2f1ca680'), p('p3d6a180'), pe('p5da1e00')],
  },
  'point': {
    sw: [pe('p9b35740')],
    sb: [pe('p9b35740')],
    lw: [pe('p20a02700'), pe('p121c4a00')],
    lb: [pe('p20a02700'), pe('p121c4a00')],
  },
  'pre-order': {
    sw: [p('p1e1cca00'), p('p150fb900'), p('p12991c00'), pe('p1be0ed00'), p('p1162b600'), p('p180d2f00'), p('pfdfb900')],
    sb: [p('p1e1cca00'), p('p150fb900'), p('p20d4c600'), pe('p3b1f6a40'), p('p13de5300'), p('p180d2f00'), p('pfdfb900')],
    lw: [pe('p462d200'),  pe('p38b7f300'), pe('p2cd98b80'), pe('p2c2ff700'), p('p2d7f0100'), p('p2a635f00'), p('p18800f00')],
    lb: [pe('p39793880'), pe('p16153f00'), pe('p13f2aa00'), pe('p7588dc0'),  p('p16422e00'), p('p10c6cd00'), p('pf492f00')],
  },
  'return': {
    sw: [p('p13523f00'), p('p2fe7c600'), p('p50f4d00')],
    sb: [p('p13523f00'), p('p2fe7c600'), p('p50f4d00')],
    lw: [p('p3e075000'),  pe('p24217d00')],
    lb: [p('p30ab8200'),  pe('p3f9d900')],
  },
  'scheduled-delivery': {
    sw: [pe('p3448e00'), p('p1b664e00'), p('p21937b80'), p('p3b3c3e80'), p('p3e98a680'), p('p5e6af90'), p('p295f2d80'), p('p2804e140')],
    sb: [pe('p3448e00'), p('p39eb3900'), p('p6414080'),  p('p23a2b200'), p('p3e98a680'), p('p3f55a700'), p('p295f2d80'), p('p2804e140')],
    lw: [p('p33f51d00'), p('p3468de00'), p('p1c6c1170'), pe('p2194df00'), pe('p2d597af0')],
    lb: [p('p33f51d00'), p('p3468de00'), p('p1c6c1170'), pe('p39c7c100'), pe('p1cd11500')],
  },
  'trade-in-program': {
    sw: [p('p312d7d80'), p('p9db0a00'),  p('p24846580'), p('p3594e000'), p('p101ac300'), p('p2a427700'), p('p1e0ff600'), p('p39e1dd80'), p('p29803fc0'), p('p3b23bd80'), p('p28593b00'), p('pb9f8a00'), p('p11f86f80'), p('p34304a00')],
    sb: [p('p338cc200'), p('p388d0600'), p('p235f0000'), p('p2725f1c0'), p('p101ac300'), p('p344bf580'), p('p3aa910f0'), p('p34952500'), p('p29803fc0'), p('p3b23bd80'), p('p151af300'), p('p3866f700'), p('p11f86f80'), p('p131ebc80')],
    lw: [p('p4c2d080'),  p('p34ff5a00'), p('p2da62300'), pe('p24217d00'), p('p10c11a00'), p('p371f5080'), p('pd7b9680'),  p('p1b922a00'), p('p2c979860'), p('p3648cb80'), p('p13b6b900'), p('p9b1cd00'),  p('p3a12d300')],
    lb: [p('pc65d580'),  p('p2f20cf80'), p('p2593fc00'), pe('p3f9d900'),  p('p12a4380'),  p('p2ed09672'), p('pd7b9680'),  p('p18695170'), p('p2c979860'), p('p2db50f00'), p('p13b6b900'), p('p10d0f900'), p('p2303a470')],
  },
  'vip': {
    sw: [p('p22f56780')],
    sb: [p('p3fb20f00')],
    lw: [pe('p38933700')],
    lb: [pe('p99c97f0')],
  },
  'vip-coupon': {
    sw: [pe('pbeb8600')],
    sb: [pe('p29725580')],
    lw: [p('p91b0a80'),  pe('p3fa15200'), p('p235c1000'), p('p1b1a0680'), p('p2b6ff580'), pe('p159a4640')],
    lb: [p('p160cce80'), pe('p2df54300'), p('p235c1000'), p('p13164700'), p('p2b6ff580'), pe('p343a6a00')],
  },
  'vip-event': {
    sw: [pe('p2112d00'), p('p121ffef0'), p('p10223b00'), p('pa8ffc80')],
    sb: [pe('p2112d00'), p('p121ffef0'), p('p10223b00'), p('pa8ffc80')],
    lw: [pe('p37e28e00'), pe('p16f98980')],
    lb: [pe('p16567d80'), pe('p2828fc70')],
  },
  'vip-installation': {
    sw: [p('p157a8b00'), p('p7752b80'), p('pd739972'), p('p118f4140')],
    sb: [p('p229e7c00'), p('p3706f400'), p('p316fd100'), p('p28487b00')],
    lw: [pe('p2b525c80'), pe('p31243600')],
    lb: [pe('p254c6b00'), pe('p31243600')],
  },
  'warranty': {
    sw: [p('p10e05300'), p('p1d0c59f0'), p('p54cac00'), pe('p3cab1f0'), p('p3157b280'), p('pc877c00')],
    sb: [p('p2e620480'), p('p5e86600'),  p('p33b5800'), pe('p1535a800'), p('p3157b280'), p('pc877c00')],
    lw: [pe('pbc79e80'), pe('p3942a600')],
    lb: [pe('p2a4a0180'), pe('pb783100')],
  },
  'welcome-coupon': {
    sw: [p('pc325500'), p('p1e510440'), p('p6679f00'), p('p33715a80'), p('p1f254400'), p('pe22a180')],
    sb: [p('pc325500'), p('p30124e00'), p('p6b0e400'), p('p9b6af80'),  p('p1f254400'), p('pe22a180')],
    lw: [pe('p2a6a3380')],
    lb: [pe('p2f1ddc00')],
  },
  'zero-interest-payment': {
    sw: [p('p1bbc5300'), pe('p3a859980'), p('p2637d400')],
    sb: [p('p1a99b900'), pe('p1dfce0f0'), p('p2637d400')],
    lw: [pe('p1a0ee980'), pe('p3cb0eb00'), p('p204f3b00'), pe('p84700'),    pe('p28782100'), p('p28497900')],
    lb: [pe('p278eb0f0'), pe('p14302180'), p('p2c3bf5f2'), pe('p17067a00'), pe('p3f079400'), p('p360d4180')],
  },
};
