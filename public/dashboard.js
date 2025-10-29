// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ740xGHLPJBaaggtTCtAJkjlok4FiGsc",
  authDomain: "yukyu-shinsei-app.firebaseapp.com",
  projectId: "yukyu-shinsei-app",
  storageBucket: "yukyu-shinsei-app.firebasestorage.app",
  messagingSenderId: "17998170437",
  appId: "1:17998170437:web:05089288198ac5c5a5162c"
};
// =================================================================

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTMLの要素を取得
const logoutButton = document.getElementById('logout-button');
const userInfoDisplay = document.getElementById('user-info-display');
const newRequestButton = document.getElementById('new-request-button');
const historyList = document.getElementById('history-list');
const pendingCountElement = document.getElementById('pending-count');
const rejectedCountElement = document.getElementById('rejected-count');
const approvedCountElement = document.getElementById('approved-count');

// ------------------------------------
// 認証状態の監視
// ------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ログインしている
        // ユーザー情報をFirestoreから取得して表示
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userInfoDisplay.textContent = `社員番号: ${userData.employeeId} (${userData.name}さん)`;
            // 申請データを読み込む
            loadUserRequests(user.uid);
        } else {
            // usersコレクションにドキュメントがない場合(エラーケース)
            console.error("ユーザー情報が見つかりません。");
            userInfoDisplay.textContent = `社員番号: ${user.email.split('@')[0]} (名前不明)`;
            loadUserRequests(user.uid); // データは読み込む試みをする
        }

    } else {
        // ログインしていない場合、ログインページにリダイレクト
        window.location.href = 'index.html';
    }
});

// ------------------------------------
// ログアウト処理
// ------------------------------------
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        // ログアウト成功
        window.location.href = 'index.html';
    }).catch((error) => {
        // ログアウト失敗
        console.error('ログアウトエラー:', error);
        alert('ログアウト中にエラーが発生しました。');
    });
});

// ------------------------------------
// 新規申請ボタンの処理
// ------------------------------------
newRequestButton.addEventListener('click', () => {
    window.location.href = 'request.html';
});

// ------------------------------------
// 申請データの読み込みと表示
// ------------------------------------
async function loadUserRequests(userId) {
    try {
        // 申請データをFirestoreから取得 (createdAtの降順 = 新しい順)
        const q = query(collection(db, "requests"), where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        // 件数カウント用変数を初期化
        let pendingCount = 0;
        let rejectedCount = 0;
        let approvedCount = 0;

        // 履歴リストをクリア
        historyList.innerHTML = '読み込み中...';

        if (querySnapshot.empty) {
            historyList.innerHTML = '<p>まだ申請はありません。</p>';
        } else {
            let historyHtml = '';
            querySnapshot.forEach((docSnap) => {
                const request = docSnap.data();
                const requestId = docSnap.id; // ドキュメントIDを取得
                const status = request.status || '承認待ち'; // statusフィールドがなければデフォルトで承認待ち

                // --- 各ステータスの件数をカウント ---
                if (status === '承認待ち') {
                    pendingCount++;
                } else if (status === '差し戻し') {
                    rejectedCount++;
                } else if (status === '承認済み') { // 管理者画面と合わせる
                    approvedCount++;
                }

                // --- 履歴アイテムのHTMLを生成 ---
                historyHtml += `
                    <div class="history-item">
                        <div class="history-item-header">
                            <span class="date-type">${formatDate(request.leaveDate)} (${translateLeaveType(request.leaveType)})</span>
                            <span class="status-badge ${getStatusClass(status)}">${status}</span>
                        </div>
                        <div class="history-item-body">
                            理由: ${escapeHTML(request.leaveReason)}
                        </div>
                        <div class="history-item-footer">
                            <button class="button-delete" data-id="${requestId}">申請を削除</button>
                        </div>
                    </div>
                `;
            });
            historyList.innerHTML = historyHtml;

            // --- 削除ボタンにイベントリスナーを追加 ---
            const deleteButtons = historyList.querySelectorAll('.button-delete');
            deleteButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const docIdToDelete = button.getAttribute('data-id');
                    deleteRequest(docIdToDelete);
                });
            });
        }

        // --- 集計した件数を画面に表示 ---
        pendingCountElement.textContent = pendingCount;
        rejectedCountElement.textContent = rejectedCount;
        approvedCountElement.textContent = approvedCount;

    } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
        historyList.innerHTML = '<p>データの表示に失敗しました。</p>';
        // 件数もエラー表示にする（オプション）
        pendingCountElement.textContent = '-';
        rejectedCountElement.textContent = '-';
        approvedCountElement.textContent = '-';
    }
}

// ------------------------------------
// 申請削除処理
// ------------------------------------
async function deleteRequest(docId) {
    // 削除前に確認ダイアログを表示
    if (window.confirm("この申請を削除してもよろしいですか？")) {
        try {
            // Firestoreからドキュメントを削除
            await deleteDoc(doc(db, "requests", docId));
            console.log("ドキュメント削除成功:", docId);
            // 削除成功後、リストを再読み込みして画面を更新
            if (auth.currentUser) {
                loadUserRequests(auth.currentUser.uid);
            }
        } catch (error) {
            console.error("ドキュメント削除エラー:", error);
            alert("申請の削除中にエラーが発生しました。");
        }
    }
}

// ------------------------------------
// ヘルパー関数
// ------------------------------------

// 休暇種別を日本語に変換
function translateLeaveType(type) {
    switch (type) {
        case 'full-day': return '全日';
        // case 'am-half': return '半日(午前)'; // 古い方をコメントアウト
        // case 'pm-half': return '半日(午後)'; // 古い方をコメントアウト
        case 'half-day-am': return '半日(午前)'; // 新しい方を追加
        case 'half-day-pm': return '半日(午後)'; // 新しい方を追加
        default: return type; // 不明な場合はそのまま返す
    }
}

// ステータスに応じたCSSクラス名を返す
function getStatusClass(status) {
    switch (status) {
        case '承認待ち': return 'status-pending';
        case '差し戻し': return 'status-rejected';
        case '承認済み': return 'status-approved';
        default: return 'status-pending'; // デフォルト
    }
}

// 日付文字列(YYYY-MM-DD)をフォーマットする（例: 2025/10/31）
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        // Dateオブジェクトに変換する際にUTCとして解釈されないように時間情報を付加
        const date = new Date(dateString + 'T00:00:00');
        // 日本のロケールで年月日を取得
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        console.error("日付のフォーマットに失敗:", dateString, e);
        return dateString; // フォーマット失敗時は元の文字列を返す
    }
}

// HTMLエスケープ処理（簡易版）
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(match) {
        switch (match) {
          case '&': return '&amp;';
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#39;';
        }
    });
}

