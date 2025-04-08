/**
 * ファイルパスからプロンプト名を抽出する関数
 * 様々なファイル名のパターンに対応
 */
export function extractPromptFromPath(path: string): string {
  // ファイルパスからプロンプト名を抽出
  const parts = path.