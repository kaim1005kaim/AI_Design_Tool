// 必要なライブラリをインポート
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 環境変数から認証情報を取得
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = Deno.env.get('REDIRECT_URI');

// HTTP サーバーの起動
serve(async (req) => {
  // CORS ヘッダーを設定（より広範なヘッダーを許可）
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-custom-header',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };

  // OPTIONS リクエスト (プリフライト) の処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // 認証ヘッダーの確認（オプション）
    const authHeader = req.headers.get('Authorization');
    console.log('認証ヘッダー:', authHeader);
    
    // 認証ヘッダーが必要な場合はここでチェックします
    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //   return new Response(
    //     JSON.stringify({ error: '認証されていません' }),
    //     { status: 401, headers }
    //   );
    // }
    
    // リクエスト情報をログに記録
    console.log('リクエスト情報:', {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    // リクエストボディをJSONとして解析
    let code;
    try {
      const body = await req.json();
      code = body.code;
      console.log('リクエストボディ:', body);
    } catch (error) {
      console.error('リクエストボディの解析エラー:', error);
      return new Response(
        JSON.stringify({ error: '無効なリクエスト形式です', details: error.message }),
        { status: 400, headers }
      );
    }
    
    // 認証コードの存在確認
    if (!code) {
      console.error('認証コードがリクエストに含まれていません');
      return new Response(
        JSON.stringify({ error: '認証コードが見つかりません' }),
        { status: 400, headers }
      );
    }

    console.log(`認証コードを受信: ${code.substring(0, 10)}...`);
    
    // 環境変数の確認
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
      console.error('環境変数が設定されていません', {
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
        hasRedirectUri: !!REDIRECT_URI
      });
      return new Response(
        JSON.stringify({ error: '認証に必要な設定が不足しています' }),
        { status: 500, headers }
      );
    }

    try {
      // Google API でトークン交換
      console.log('トークン交換開始 - パラメータ:', {
        client_id: GOOGLE_CLIENT_ID.substring(0, 10) + '...',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_length: code.length
      });

      console.log('トークン交換開始 - パラメータ:', {
        client_id: GOOGLE_CLIENT_ID.substring(0, 10) + '...',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_length: code.length
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });

      // レスポンスの処理
      let tokenData;
      try {
        tokenData = await tokenResponse.json();
      } catch (parseError) {
        const rawText = await tokenResponse.text();
        console.error('トークンレスポンスのJSONパース失敗:', {
          status: tokenResponse.status,
          text: rawText
        });
        return new Response(
          JSON.stringify({ error: 'トークンレスポンスの解析に失敗しました', rawResponse: rawText }),
          { status: 500, headers }
        );
      }

      console.log('トークンレスポンス情報:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        headers: Object.fromEntries(tokenResponse.headers.entries()),
        bodyType: tokenResponse.ok ? 'SUCCESS' : 'ERROR'
      });

      if (tokenResponse.ok) {
        console.log('トークンの取得に成功しました');
        return new Response(
          JSON.stringify(tokenData),
          { headers }
        );
      } else {
        console.error('トークン取得エラー:', tokenData);
        return new Response(
          JSON.stringify({ error: 'トークン取得に失敗しました', details: tokenData }),
          { status: tokenResponse.status, headers }
        );
      }
    } catch (tokenError) {
      console.error('トークン取得中のエラー:', tokenError);
      return new Response(
        JSON.stringify({ error: 'トークン取得中にエラーが発生しました', message: tokenError.message }),
        { status: 500, headers }
      );
    }
  } catch (error) {
    // エラーハンドリング
    console.error('サーバーエラー:', error);
    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました', message: error.message }),
      { status: 500, headers: { ...headers } }
    );
  }
});
