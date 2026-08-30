// Navigate：用于页面跳转
// Outlet：用于渲染当前路由匹配到的子页面
// useLocation：获取用户当前访问的地址
import { Navigate, Outlet, useLocation } from 'react-router';

// 读取浏览器中保存的登录 token
import { getAccessToken } from '@/utils/auth';

// 路由守卫组件：只有已登录用户才能看到它包裹的业务页面
const RequireAuth = () => {
  // 例如当前用户正在访问：/apps/notes?page=2
  const location = useLocation();

  // 从 localStorage 或 sessionStorage 中获取 token
  const token = getAccessToken();

  // 没有 token，视为未登录
  if (!token) {
    // 记录原本想访问的页面。
    // 登录成功后，可以跳回这个页面，而不是固定跳首页。
    const from = `${location.pathname}${location.search}`;

    return (
      <Navigate
        // 未登录时跳转到登录页
        to="/auth/auth2/login"
        // 替换当前历史记录，避免用户按“后退”又回到受保护页面
        replace
        // 向登录页传递原访问地址；登录成功后从 location.state 中取出
        state={{ from }}
      />
    );
  }

  // 已有 token：继续渲染它下面匹配到的业务子路由
  // 例如首页、笔记页、博客页等
  return <Outlet />;
};

export default RequireAuth;
