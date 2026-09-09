/**
 * Content Banner Builder draft payload — the whole edit session as plain JSON.
 *
 * Everything the operator can set is here: the picked asset and channel/size,
 * the copy, the icon-row settings, the plate colour (+opacity), the product
 * cut-outs (dataURLs from the crop pipeline), the Benefit boxes, and the
 * uploaded 3000² custom art (stored as a dataURL so it survives the session
 * that minted its blob URL).
 */

import type { SlotCopy } from '../components/contenttemplate/SlotCopyEditor';
import type { ProductSlots } from '../components/contenttemplate/ProductSlotsEditor';
import type { BenefitSlots } from '../components/contenttemplate/BenefitSlotsEditor';

export const CONTENT_BANNER_SCHEMA_VERSION = 1;

export interface ContentBannerPayloadV1 {
  selectedId: string | null;
  channelKey: string | null;
  sizeKey: string | null;
  copy: SlotCopy;
  iconKind: 'none' | 'solid' | 'line';
  iconColor: 'black' | 'white';
  iconCount: 1 | 2 | 3;
  solidIconIds: string[];
  lineIconIds: string[];
  solidIconLabels: (string | null)[];
  lineIconLabels: (string | null)[];
  showDisclaimer: boolean;
  showIndicator: boolean;
  plateColor: string;
  /** Per-asset product slots; images are dataURLs. */
  products: Record<string, ProductSlots>;
  benefitSlots: BenefitSlots;
  /** The UPLOAD IMAGE square as a dataURL, when one was chosen. */
  uploadDataUrl: string | null;
}
