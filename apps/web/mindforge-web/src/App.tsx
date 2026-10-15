import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { SWRConfig } from 'swr';
import { subscribeAuthChanges } from './utils/auth';
import router from './routes/Router';

function App() {
  const [sessionVersion, setSessionVersion] = useState(0);
  useEffect(() => subscribeAuthChanges(() => setSessionVersion((version) => version + 1)), []);

  // 每次登录身份变化使用独立缓存，旧请求只能写入已卸载的缓存。
  return (
    <SWRConfig key={sessionVersion} value={{ provider: () => new Map() }}>
      <RouterProvider router={router} />
    </SWRConfig>
  );
}

export default App;
