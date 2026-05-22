import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    run_mode: 'manual',
    auto_interval_days: 7,
    preferred_subject: '数学',
    preferred_subfield: '动力系统',
  });
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLogic, setNewLogic] = useState('AND');
  const [msg, setMsg] = useState('');
  const [subjectInfo, setSubjectInfo] = useState({ subjects: [], subfields: {} });

  useEffect(() => {
    api.getSettings().then((data) => {
      setSettings((prev) => ({ ...prev, ...data }));
    });
    api.listKeywords().then((data) => setKeywords(data));
    api.getSubjects().then(setSubjectInfo).catch(() => {});
  }, []);

  const saveSettings = async () => {
    try {
      await api.updateSettings(settings);
      setMsg('设置已保存');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('保存失败: ' + e.message);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    try {
      const data = await api.addKeyword({ term: newKeyword.trim(), logic: newLogic });
      setKeywords([data, ...keywords]);
      setNewKeyword('');
    } catch (e) {
      setMsg('添加失败: ' + e.message);
    }
  };

  const removeKeyword = async (id) => {
    try {
      await api.deleteKeyword(id);
      setKeywords(keywords.filter((k) => k.id !== id));
    } catch (e) {
      setMsg('删除失败: ' + e.message);
    }
  };

  const currentSubfields = settings.preferred_subject
    ? subjectInfo.subfields[settings.preferred_subject] || []
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h2>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{msg}</div>}

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">运行模式</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="run_mode"
              value="manual"
              checked={settings.run_mode === 'manual'}
              onChange={(e) => setSettings({ ...settings, run_mode: e.target.value })}
              className="h-4 w-4 text-indigo-600"
            />
            <span>手动模式（每次点击按钮执行）</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="run_mode"
              value="auto"
              checked={settings.run_mode === 'auto'}
              onChange={(e) => setSettings({ ...settings, run_mode: e.target.value })}
              className="h-4 w-4 text-indigo-600"
            />
            <span>自动模式（按设定周期自动执行）</span>
          </label>
        </div>

        {settings.run_mode === 'auto' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">执行周期</label>
            <select
              value={settings.auto_interval_days}
              onChange={(e) => setSettings({ ...settings, auto_interval_days: Number(e.target.value) })}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value={7}>每 7 天</option>
              <option value={15}>每 15 天</option>
              <option value={30}>每 30 天</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">学科与研究方向偏好</h3>
        <p className="text-sm text-gray-500 mb-4">设置默认的搜索学科和研究方向，将在搜索时自动应用。</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">学科</label>
            <select
              value={settings.preferred_subject || ''}
              onChange={(e) => {
                const subject = e.target.value;
                setSettings({
                  ...settings,
                  preferred_subject: subject,
                  preferred_subfield: '',
                });
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="">请选择学科</option>
              {subjectInfo.subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">研究方向</label>
            <select
              value={settings.preferred_subfield || ''}
              onChange={(e) => setSettings({ ...settings, preferred_subfield: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              disabled={!settings.preferred_subject}
            >
              <option value="">请选择研究方向</option>
              {currentSubfields.map((sf) => (
                <option key={sf} value={sf}>
                  {sf}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">关键词管理</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="输入关键词"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <select value={newLogic} onChange={(e) => setNewLogic(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="AND">AND</option>
            <option value="OR">OR</option>
            <option value="NOT">NOT</option>
          </select>
          <button onClick={addKeyword} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">添加</button>
        </div>
        <div className="space-y-2">
          {keywords.map((kw) => (
            <div key={kw.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
              <span className="text-sm">
                <span className="font-medium">{kw.term}</span>
                <span className="text-xs text-gray-500 ml-2">({kw.logic})</span>
              </span>
              <button onClick={() => removeKeyword(kw.id)} className="text-red-500 text-sm hover:underline">删除</button>
            </div>
          ))}
          {keywords.length === 0 && <div className="text-sm text-gray-400">暂无关键词</div>}
        </div>
      </div>

      <button onClick={saveSettings} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
        保存设置
      </button>
    </div>
  );
}
