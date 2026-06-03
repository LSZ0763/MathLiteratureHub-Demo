import { useState } from 'react';
import Home from './pages/Home';
import Settings from './pages/Settings';
import History from './pages/History';

function App() {
  const [page, setPage] = useState('home');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-indigo-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">个性化科研助手</h1>
          <div className="space-x-4 text-sm">
            <button onClick={() => setPage('home')} className={`${page==='home'?'underline':''} hover:opacity-80`}>首页</button>
            <button onClick={() => setPage('history')} className={`${page==='history'?'underline':''} hover:opacity-80`}>历史</button>
            <button onClick={() => setPage('settings')} className={`${page==='settings'?'underline':''} hover:opacity-80`}>设置</button>
          </div>
        </div>
      </nav>
      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 py-4 overflow-hidden">
        {page === 'home' && <Home setPage={setPage} />}
        {page === 'settings' && <Settings />}
        {page === 'history' && <History />}
      </main>
    </div>
  );
}

export default App;
