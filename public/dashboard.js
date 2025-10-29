// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// 【重要】あなたのFirebaseプロジェクトの設定情報を貼り付けてください
// (前回ご共有いただいたものを埋め込んであります)
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBJ740xGHLPJBaaggtTCtAJkjlok4FiGsc",
  authDomain: "yukyu-shinsei-app.firebaseapp.com",
  projectId: "yukyu-shinsei-app",
  storageBucket: "yukyu-shinsei-app.firebasestorage.app",
  messagingSenderId: "17998170437",
  appId: "1:17998170437:web:05089288198ac5c5a5162c"
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTMLの要素を取得
const userInfoDisplay = document.getElementById('user-info-display');
const logoutButton = document.getElementById('logout-button');
const newRequestButton = document.getElementById('new-request-button');
const historyList = document.getElementById('history-list');

// 【修正】件数表示用の要素を取得
const pendingCountEl = document.getElementById('pending-count');
const rejectedCountEl = document.getElementById('rejected-count');
const approvedCountEl = document.getElementById('approved-count');


// 認証状態の監視
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ログインしている
        console.log("ログインユーザー:", user.uid);
        // ユーザー情報を表示
        await displayUserInfo(user.uid);
        // ユーザーの申請データを読み込み
        await loadAndDisplayUserRequests(user.uid);
    } else {
        // ログインしていない
        console.log("未ログイン状態。ログインページに戻ります。");
        window.location.href = 'index.html'; // ログインページに強制リダイレクト
    }
});

// ユーザー情報を表示する関数
async function displayUserInfo(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // 社員番号と名前を表示
            userInfoDisplay.textContent = `社員番号: ${userData.employeeId} (${userData.name}さん)`;
        } else {
            console.warn("Firestoreにユーザー情報が見つかりません。");
            userInfoDisplay.textContent = "ユーザー情報なし";
        }
    } catch (error) {
        console.error("ユーザー情報の取得エラー:", error);
        userInfoDisplay.textContent = "情報取得エラー";
    }
}

// ログアウトボタン
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log('ログアウトしました。');
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('ログアウト失敗:', error);
    });
});

// 新規申請ボタン
newRequestButton.addEventListener('click', () => {
    window.location.href = 'request.html';
});

// 休暇種別を日本語に翻訳する関数
function translateLeaveType(leaveType) {
    switch (leaveType) {
        case 'full-day':
            return '全日';
        case 'half-day-am':
            return '半日(午前)';
        case 'half-day-pm':
            return '半日(午後)';
        default:
            return leaveType;
    }
}

// ユーザーの申請データを読み込んで表示する関数
async function loadAndDisplayUserRequests(uid) {
    try {
        // 自分の申請(userIdが一致)を、作成日時の降順(新しい順)で取得
        const q = query(
            collection(db, "requests"),
            where("userId", "==", uid),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        
        historyList.innerHTML = ''; // リストをクリア

        if (querySnapshot.empty) {
            historyList.innerHTML = '<div class="history-item-placeholder"><p>まだ申請はありません。</p></div>';
            pendingCountEl.textContent = '0';
            rejectedCountEl.textContent = '0';
            approvedCountEl.textContent = '0';
            return;
        }

        // 【修正】件数を集計する変数を初期化
        let pendingCount = 0;
        let rejectedCount = 0;
        let approvedCount = 0;

        const allRequests = []; // データを一時的に格納する配列
        querySnapshot.forEach((doc) => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });

        // HTMLを構築
        allRequests.forEach(request => {
            const requestItem = document.createElement('div');
            requestItem.classList.add('history-item');

            const status = request.status;
            let statusClass = '';
            let statusText = '';

            // 【修正】ステータスに応じて件数を集計し、CSSクラスを決定
            switch (status) {
                case '承認待ち':
                    pendingCount++;
                    statusClass = 'status-pending';
                    statusText = '承認待ち';
                    break;
                case '承認済み':
                    approvedCount++;
                    statusClass = 'status-approved';
                    statusText = '承認済み';
                    break;
                case '差し戻し':
                    rejectedCount++;
                    statusClass = 'status-rejected'; // 差し戻しクラス
                    statusText = '差し戻し';
                    break;
                default:
                    statusText = status;
            }

            const vacationDate = request.leaveDate;
            const leaveType = translateLeaveType(request.leaveType);
            const reason = request.leaveReason;

            let actionsHtml = ''; // アクションボタン用のHTML
            
            // 【追加】「承認待ち」または「差し戻し」の場合、削除ボタンを表示
            if (status === '承認待ち' || status === '差し戻し') {
                actionsHtml = `
                    <div class="history-item-actions">
                        <button class="delete-button" data-id="${request.id}">申請を削除</button>
                    </div>
                `;
            }

            requestItem.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-date-type">${vacationDate} (${leaveType})</span>
                    <span class="status-tag ${statusClass}">${statusText}</span>
                </div>
                <p class="history-item-reason">理由: ${reason}</p>
                ${actionsHtml}
            `;
            
            historyList.appendChild(requestItem);
        });

        // 【修正】集計した件数を画面に反映
        pendingCountEl.textContent = pendingCount;
        rejectedCountEl.textContent = rejectedCount;
        approvedCountEl.textContent = approvedCount;

        // 【追加】削除ボタンにイベントリスナーを設定
        addDeleteEventListeners();

    } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
        historyList.innerHTML = '<div class="history-item-placeholder"><p>データの表示に失敗しました。</p></div>';
    }
}

// 【追加】削除ボタンにイベントリスナーを設定する関数
function addDeleteEventListeners() {
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            // 確認ダイアログ（誤操作防止）
            if (confirm('この申請を本当に削除しますか？この操作は取り消せません。')) {
                deleteRequest(id);
            }
        });
    });
}

// 【追加】申請を削除する関数
async function deleteRequest(docId) {
    try {
        const requestDocRef = doc(db, "requests", docId);
        await deleteDoc(requestDocRef);
        
        console.log(`申請 ${docId} を削除しました。`);
        
        // 削除後にリストを再読み込み
        if (auth.currentUser) {
            loadAndDisplayUserRequests(auth.currentUser.uid);
        }
        
    } catch (error) {
        console.error("申請の削除エラー:", error);
        alert("申請の削除に失敗しました。");
    }
}

