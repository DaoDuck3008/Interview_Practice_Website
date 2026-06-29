import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SEPAY_BASE = 'https://userapi.sepay.vn/v2';
const TIMEOUT_MS = 15_000;
const PER_PAGE = 100; // tối đa Sepay cho phép
const MAX_PAGES = 50; // chặn an toàn: tối đa 5000 giao dịch / lần đối soát

/** Một giao dịch ngân hàng do Sepay trả về (chỉ các field mình dùng). */
export interface SepayTransaction {
  id: string;
  transaction_date: string; // "YYYY-MM-DD HH:mm:ss"
  account_number: string | null;
  amount_in: number;
  amount_out: number;
  accumulated: number;
  transaction_content: string | null;
  reference_number: string | null;
  code: string | null;
  bank_brand_name: string | null;
}

interface ListParams {
  /** YYYY-MM-DD (bao gồm) */
  dateFrom: string;
  /** YYYY-MM-DD (bao gồm) */
  dateTo: string;
}

/**
 * Client gọi Sepay Userapi v2 để lấy danh sách giao dịch ngân hàng (đối soát).
 * Docs: https://developer.sepay.vn/vi/sepay-api/v2
 */
@Injectable()
export class SepayClient {
  private readonly apiToken: string;
  private readonly logger = new Logger(SepayClient.name);

  constructor(private config: ConfigService) {
    this.apiToken = this.config.get<string>('sepay.apiToken') ?? '';
  }

  /** Đã cấu hình token chưa (FE dùng để ẩn/hiện tab đối soát). */
  isConfigured(): boolean {
    return this.apiToken.length > 0;
  }

  /** Lấy toàn bộ giao dịch tiền VÀO trong khoảng ngày (gộp các trang). */
  async listIncoming({
    dateFrom,
    dateTo,
  }: ListParams): Promise<SepayTransaction[]> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình Sepay API (SEPAY_API_KEY).',
      );
    }

    const all: SepayTransaction[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, hasMore } = await this.fetchPage(dateFrom, dateTo, page);
      all.push(...data);
      if (!hasMore) break;
    }
    return all;
  }

  private async fetchPage(
    dateFrom: string,
    dateTo: string,
    page: number,
  ): Promise<{ data: SepayTransaction[]; hasMore: boolean }> {
    const params = new URLSearchParams({
      transfer_type: 'in', // chỉ lấy tiền vào
      transaction_date_from: dateFrom,
      transaction_date_to: dateTo,
      transaction_date_sort: 'desc',
      page: String(page),
      per_page: String(PER_PAGE),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Gửi yêu cầu lấy danh sách giao dịch tới SePay
      const res = await fetch(
        `${SEPAY_BASE}/transactions?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${this.apiToken}` }, // Gán API_KEY để có quyền truy cập vào SePay
          signal: controller.signal, // Huỷ nếu quá thời gian timeout
        },
      );

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Sepay ${res.status}: ${body.slice(0, 300)}`);
        if (res.status === 429) {
          throw new ServiceUnavailableException(
            'Sepay đang giới hạn tần suất gọi. Vui lòng thử lại sau.', // Chạm rate limit của SePay (quá 3 request/giây)
          );
        }
        if (res.status === 401) {
          throw new ServiceUnavailableException(
            'Sepay API token không hợp lệ — kiểm tra SEPAY_API_KEY.', // Token không hợp lệ
          );
        }
        throw new ServiceUnavailableException(
          'Không gọi được Sepay API. Vui lòng thử lại sau.', // Timeout hoặc lỗi 502, 500, 503
        );
      }

      const json = (await res.json()) as {
        data?: SepayTransaction[];
        meta?: { pagination?: { has_more?: boolean } };
      };
      return {
        data: json.data ?? [], // Trả về danh sách giao dịch tiền VÀO
        hasMore: json.meta?.pagination?.has_more ?? false, // Có còn trang tiếp theo không
      };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Sepay call failed: ${String(err)}`);
      throw new ServiceUnavailableException(
        'Không kết nối được Sepay API. Vui lòng thử lại sau.', // Timeout hoặc lỗi 502, 500, 503
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
