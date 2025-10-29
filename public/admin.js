// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const pendingListBody = document.getElementById('pending-list-body');

// 認証状態の監視
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ログインしている
        const userRole = await checkUserRole(user.uid);
        
        if (userRole === 'admin') {
            // 管理者の場合
            userInfoDisplay.textContent = `管理者 (${user.email.split('@')[0]}) でログイン中`;
            // 承認待ちの申請データを読み込む
            loadPendingRequests();
        } else {
            // 一般社員がURL直打ちなどでアクセスしてきた場合
            console.warn('一般社員が管理者ページにアクセスしようとしました。');
            window.location.href = 'index.html'; // ログインページに強制リダイレクト
        }
    } else {
        // ログインしていない
        console.log('未ログインのユーザーが管理者ページにアクセスしようとしました。');
        window.location.href = 'index.html'; // ログインページに強制リダイレクト
    }
});

// ユーザーの役割（ロール）をFirestoreから取得する関数
async function checkUserRole(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            return userDocSnap.data().role; // 'admin' または 'employee' が返る
        } else {
            console.warn(`Firestoreにユーザー情報(uid: ${uid})が見つかりません。`);
            return null; // ユーザー情報が存在しない
        }
    } catch (error) {
        console.error("ロールの取得中にエラー:", error);
        return null;
    }
}

// ログアウトボタンの処理
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        // サインアウト成功
        console.log('ログアウトしました。');
        window.location.href = 'index.html';
    }).catch((error) => {
        // エラー
        console.error('ログアウト失敗:', error);
    });
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
            return leaveType; // 不明な値はそのまま表示
    }
}

// 承認待ちの申請データを読み込む関数
async function loadPendingRequests() {
    try {
        // 【修正】まず全ユーザーの情報を取得してMapに格納
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        const userMap = new Map();
        usersSnapshot.forEach(doc => {
            // 'users'ドキュメントのID(uid)をキー、'name'フィールドを値として保存
            userMap.set(doc.id, doc.data().name); 
        });

        // 'status' が '承認待ち' のデータを、'createdAt' (作成日時) の昇順（古い順）で取得
        const q = query(
            collection(db, "requests"), 
            where("status", "==", "承認待ち"),
            orderBy("createdAt", "asc") // 古い申請から順に
        );

        const querySnapshot = await getDocs(q);
        
        pendingListBody.innerHTML = ''; // テーブルをクリア

        if (querySnapshot.empty) {
            pendingListBody.innerHTML = '<tr><td colspan="6">承認待ちの申請はありません。</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const request = doc.data();
            const docId = doc.id; 

            const tr = document.createElement('tr');
            
            // 申請日 (Dateオブジェクトから 'YYYY-MM-DD' 形式に変換)
            const requestDate = request.createdAt.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
            // 休暇取得日
            const vacationDate = request.leaveDate;
            
            // 日本語に翻訳した値を使用
            const leaveTypeJapanese = translateLeaveType(request.leaveType);
            
            // 【修正】userMapから名前を取得
            // request.userId (申請者のuid) を使って、userMapから名前を探す
            const applicantName = userMap.get(request.userId) || '(名前なし)'; // 該当uidがなければ'(名前なし)'

            tr.innerHTML = `
                <td>${requestDate}</td>
                
                <!-- 【修正】社員番号と名前を併記 -->
                <td>${request.employeeId} (${applicantName})</td>
                
                <td>${vacationDate}</td>
                <td>${leaveTypeJapanese}</td> 
                <td>${request.leaveReason}</td>
                <td>
                    <button class="approve-button" data-id="${docId}">承認</button>
                    <button class="reject-button" data-id="${docId}">差し戻し</button>
                </td>
            `;
            pendingListBody.appendChild(tr);
        });

        // ボタンにクリックイベントを追加
        addEventListenersToButtons();

    } catch (error) {
        console.error("承認待ちデータの取得エラー:", error);
        if (error.code === 'failed-precondition') {
            console.error("インデックスが必要です。コンソールのリンクをクリックして作成してください。");
            pendingListBody.innerHTML = `<tr><td colspan="6">データの読み込みに失敗しました。コンソールのリンクからインデックスを作成してください。</td></tr>`;
        } else {
            pendingListBody.innerHTML = '<tr><td colspan="6">データの読み込みに失敗しました。</td></tr>';
        }
    }
}

// 承認・差し戻しボタンにイベントリスナーを設定する関数
function addEventListenersToButtons() {
    // 承認ボタン
    document.querySelectorAll('.approve-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            // 確認ダイアログ（誤操作防止）
            if (confirm('この申請を「承認済み」にしてよろしいですか？')) {
                updateRequestStatus(id, '承認済み');
            }
        });
    });

    // 差し戻しボタン
    document.querySelectorAll('.reject-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            // 確認ダイアログ（誤操作防止）
            if (confirm('この申請を「差し戻し」にしてよろしいですか？')) {
                updateRequestStatus(id, '差し戻し');
            }
        });
    });
}

// 申請ステータスを更新する関数
async function updateRequestStatus(docId, newStatus) {
    try {
        // ステータス更新中はボタンを無効化
        document.querySelectorAll(`button[data-id="${docId}"]`).forEach(b => b.disabled = true);
        
        const requestDocRef = doc(db, "requests", docId);
        
        // データを更新
        await updateDoc(requestDocRef, {
            status: newStatus
        });
        
        console.log(`申請 ${docId} を「${newStatus}」に更新しました。`);
        
        // データを再読み込みして画面を更新
        loadPendingRequests();
        
    } catch (error) {
        console.error("ステータス更新エラー:", error);
        alert("ステータスの更新に失敗しました。");
        // エラーが発生してもボタンを有効に戻す
        document.querySelectorAll(`button[data-id="${docId}"]`).forEach(b => b.disabled = false);
    }
}

