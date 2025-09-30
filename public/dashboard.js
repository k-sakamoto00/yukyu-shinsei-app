// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// 【重要】並び替え(orderBy)の機能を追加で読み込みます
import { getFirestore, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// 【重要】あなたのFirebaseプロジェクトの設定情報を貼り付けてください
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

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTML要素の取得
const userInfoDisplay = document.getElementById('user-info-display');
const logoutButton = document.getElementById('logout-button');
const newRequestButton = document.getElementById('new-request-button');
const pendingCountElement = document.getElementById('pending-count');
const historyListElement = document.getElementById('history-list');

// ログインユーザーの申請データをFirestoreから取得して表示する関数
const displayUserRequests = async (user) => {
    try {
        // 'requests'コレクションから、'userId'がログインユーザーのIDと一致するものを
        // 【修正】'createdAt'フィールドを基準に降順（新しいものが上）で並び替え
        const q = query(collection(db, "requests"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        
        const querySnapshot = await getDocs(q);
        
        let pendingCount = 0;
        let historyHtml = '';

        if (querySnapshot.empty) {
            historyListElement.innerHTML = '<div class="history-item-empty">まだ申請はありません。</div>';
        } else {
            querySnapshot.forEach(doc => {
                const request = doc.data();

                if (request.status === '承認待ち') {
                    pendingCount++;
                }

                let leaveTypeDisplay = '';
                switch(request.leaveType) {
                    case 'full-day': leaveTypeDisplay = '全日'; break;
                    case 'half-day-am': leaveTypeDisplay = '半日(午前)'; break;
                    case 'half-day-pm': leaveTypeDisplay = '半日(午後)'; break;
                    default: leaveTypeDisplay = request.leaveType;
                }
                
                // 【修正】申請理由を表示する部分を追加
                historyHtml += `
                    <div class="history-item">
                        <div class="history-item-main">
                            <div class="history-item-date">${request.leaveDate} (${leaveTypeDisplay})</div>
                            <div class="history-item-status status-${request.status === '承認待ち' ? 'pending' : 'completed'}">
                                ${request.status}
                            </div>
                        </div>
                        <div class="history-item-reason">
                           理由： ${request.leaveReason || '理由なし'}
                        </div>
                    </div>
                `;
            });
            historyListElement.innerHTML = historyHtml;
        }

        pendingCountElement.textContent = pendingCount;

    } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
        historyListElement.innerHTML = '<div class="history-item-empty">データの表示に失敗しました。</div>';
    }
};


// ユーザーのログイン状態を監視
onAuthStateChanged(auth, (user) => {
    if (user) {
        const employeeId = user.email.split('@')[0];
        userInfoDisplay.textContent = `社員番号: ${employeeId}`;
        displayUserRequests(user);
    } else {
        window.location.href = 'index.html';
    }
});

// ログアウトボタンの処理
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('ログアウトエラー', error);
    });
});

// 新規申請ボタンがクリックされた時の処理
newRequestButton.addEventListener('click', () => {
    window.location.href = 'request.html';
});

