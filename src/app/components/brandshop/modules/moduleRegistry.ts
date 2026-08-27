export type ModuleType =
  | 'official-store'
  | 'follow-us'
  | 'text'
  | 'kv'
  | 'kv-product-list'
  | 'category-list'
  | 'product-cards'
  | 'banner'
  | 'vouchers'
  | 'value-props';

/** The real marketplace upload slot type each module maps to (shown in the palette
 *  and appended to the export filename). */
export type UploadModule = 'Single Banner' | 'Multi-Clickable Banner' | 'Banner Carousel';

export interface ModuleDef {
  type: ModuleType;
  label: string;
  width: number;
  height: number | 'free';
  placeholderHeight: number;
  maxCount: number;
  zipName: string;
  uploadModule: UploadModule;
}

export const MODULE_DEFS: ModuleDef[] = [
  { type: 'official-store',  label: 'Official store',   width: 1200, height: 180,    placeholderHeight: 180,  maxCount: 1,  zipName: 'official-store',  uploadModule: 'Single Banner'          },
  { type: 'follow-us',       label: 'Follow us',        width: 1200, height: 120,    placeholderHeight: 120,  maxCount: 1,  zipName: 'follow-us',       uploadModule: 'Single Banner'          },
  { type: 'text',            label: 'Text',             width: 1200, height: 160,    placeholderHeight: 160,  maxCount: 6,  zipName: 'text',            uploadModule: 'Single Banner'          },
  { type: 'kv',              label: 'KV',               width: 1200, height: 1200,   placeholderHeight: 1200, maxCount: 2,  zipName: 'KV',              uploadModule: 'Single Banner'          },
  { type: 'kv-product-list', label: 'KV+Product list',  width: 1200, height: 'free', placeholderHeight: 600,  maxCount: 2,  zipName: 'KV-product-list', uploadModule: 'Multi-Clickable Banner' },
  { type: 'category-list',   label: 'Category list',    width: 1200, height: 'free', placeholderHeight: 397,  maxCount: 1,  zipName: 'category-list',   uploadModule: 'Multi-Clickable Banner' },
  { type: 'product-cards',   label: 'Product cards',    width: 1200, height: 'free', placeholderHeight: 904,  maxCount: 6,  zipName: 'product-cards',   uploadModule: 'Multi-Clickable Banner' },
  { type: 'banner',          label: 'Banner',           width: 1200, height: 628,    placeholderHeight: 628,  maxCount: 3,  zipName: 'banner',          uploadModule: 'Banner Carousel'        },
  { type: 'vouchers',        label: 'Vouchers',         width: 1200, height: 'free', placeholderHeight: 742,  maxCount: 2,  zipName: 'vouchers',        uploadModule: 'Multi-Clickable Banner' },
  { type: 'value-props',     label: 'Value props',      width: 1200, height: 346,    placeholderHeight: 346,  maxCount: 1,  zipName: 'value-props',     uploadModule: 'Single Banner'          },
];

export function getModuleDef(type: ModuleType): ModuleDef {
  return MODULE_DEFS.find(d => d.type === type)!;
}
