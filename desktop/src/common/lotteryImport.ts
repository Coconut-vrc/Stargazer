/**
 * 抽選結果TSVインポート用パーサーとバリデーション
 */

import type { UserBean } from '@/common/types/entities';

/**
 * 抽選結果TSVの期待されるヘッダー
 */
export const LOTTERY_RESULT_HEADERS = [
    'timestamp',
    'name',
    'x_id',
    'first_flag',
    '希望1',
    '希望2',
    '希望3',
    '意気込み',
    'is_pair_ticket',
] as const;

/**
 * 抽選結果TSVのバリデーション結果
 */
export interface LotteryImportValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * 抽選結果TSVのヘッダーを検証
 */
export function validateLotteryHeaders(headers: string[]): LotteryImportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ヘッダー数チェック
    if (headers.length !== LOTTERY_RESULT_HEADERS.length) {
        errors.push(
            `ヘッダー列数が不正です。期待: ${LOTTERY_RESULT_HEADERS.length}列, 実際: ${headers.length}列`
        );
    }

    // 各ヘッダーの一致チェック
    for (let i = 0; i < LOTTERY_RESULT_HEADERS.length; i++) {
        const expected = LOTTERY_RESULT_HEADERS[i];
        const actual = headers[i];

        if (actual !== expected) {
            errors.push(
                `列${i + 1}のヘッダーが不正です。期待: "${expected}", 実際: "${actual}"`
            );
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * 抽選結果TSVの行データを検証
 */
export function validateLotteryRow(
    row: string[],
    rowIndex: number
): LotteryImportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 列数チェック
    if (row.length !== LOTTERY_RESULT_HEADERS.length) {
        errors.push(
            `行${rowIndex + 1}: 列数が不正です。期待: ${LOTTERY_RESULT_HEADERS.length}列, 実際: ${row.length}列`
        );
        return { isValid: false, errors, warnings };
    }

    const name = row[1];
    const x_id = row[2];
    const is_pair_ticket = row[8];

    // 必須フィールドチェック
    if (!name || name.trim() === '') {
        errors.push(`行${rowIndex + 1}: 名前が空です`);
    }

    if (!x_id || x_id.trim() === '') {
        errors.push(`行${rowIndex + 1}: X IDが空です`);
    }

    // is_pair_ticketの値チェック（0 or 1）
    if (is_pair_ticket && is_pair_ticket !== '0' && is_pair_ticket !== '1') {
        warnings.push(
            `行${rowIndex + 1}: is_pair_ticketの値が不正です（"${is_pair_ticket}"）。0または1である必要があります`
        );
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * 抽選結果TSVの行をUserBeanに変換
 */
export function parseLotteryRow(row: string[]): UserBean {
    const [timestamp, name, x_id, first_flag, cast1, cast2, cast3, note, is_pair_ticket] = row;

    const casts: string[] = [];
    if (cast1 && cast1.trim()) casts.push(cast1.trim());
    if (cast2 && cast2.trim()) casts.push(cast2.trim());
    if (cast3 && cast3.trim()) casts.push(cast3.trim());

    return {
        timestamp: timestamp?.trim() || '',
        name: name?.trim() || '',
        x_id: x_id?.trim() || '',
        first_flag: first_flag?.trim() || '',
        casts,
        note: note?.trim() || '',
        is_pair_ticket: is_pair_ticket === '1',
        raw_extra: [],
    };
}

/**
 * 抽選結果TSV全体を検証してパース
 */
export function parseLotteryResultTsv(
    content: string
): {
    users: UserBean[];
    validation: LotteryImportValidation;
} {
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

    if (lines.length === 0) {
        return {
            users: [],
            validation: {
                isValid: false,
                errors: ['ファイルが空です'],
                warnings: [],
            },
        };
    }

    // ヘッダー行を取得
    const headerLine = lines[0];
    const headers = headerLine.split('\t');

    // ヘッダー検証
    const headerValidation = validateLotteryHeaders(headers);
    if (!headerValidation.isValid) {
        return {
            users: [],
            validation: headerValidation,
        };
    }

    // データ行を検証してパース
    const users: UserBean[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [...headerValidation.warnings];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t');
        const rowValidation = validateLotteryRow(row, i);

        allErrors.push(...rowValidation.errors);
        allWarnings.push(...rowValidation.warnings);

        if (rowValidation.isValid) {
            users.push(parseLotteryRow(row));
        }
    }

    return {
        users,
        validation: {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
        },
    };
}
