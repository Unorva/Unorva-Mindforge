// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import RequireAuth from './RequireAuth';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));


// dashboards

const ModernDashboard = Loadable(lazy(() => import('../views/dashboards/modern')));

const Error = Loadable(lazy(() => import('../views/auth/error')));

//apps
const Blog = Loadable(lazy(() => import('../views/apps/blog/post')));
const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/detail')));
const BlogAdd = Loadable(lazy(() => import('../views/apps/blog/create')));
const BlogEdit = Loadable(lazy(() => import('../views/apps/blog/edit')));
const BlogTable = Loadable(lazy(() => import('../views/apps/blog/manage-blog')));

const Notes = Loadable(lazy(() => import('../views/apps/notes')));
const Mail = Loadable(lazy(() => import('../views/apps/mail')));
const DailyReview = Loadable(lazy(() => import('../views/apps/daily-review')));
const Projects = Loadable(lazy(() => import('../views/apps/projects')));
const Finance = Loadable(lazy(() => import('../views/apps/finance')));

// authentication

const Login2 = Loadable(lazy(() => import('../views/auth/auth2/login')));

const Router = [
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <FullLayout />,
        children: [
          { index: true, element: <ModernDashboard /> },
          { path: 'dashboards/modern', element: <ModernDashboard /> },
          { path: 'apps/blog/post', element: <Blog /> },
          { path: 'apps/blog/detail/:id', element: <BlogDetail /> },
          { path: 'apps/blog/create', element: <BlogAdd /> },
          { path: 'apps/blog/edit', element: <BlogEdit /> },
          { path: 'apps/blog/manage-blog', element: <BlogTable /> },
          { path: 'apps/notes', element: <Notes /> },
          { path: 'apps/mail', element: <Mail /> },
          { path: 'apps/daily-review', element: <DailyReview /> },
          { path: 'apps/projects', element: <Projects /> },
          { path: 'apps/projects/:projectId', element: <Projects /> },
          { path: 'apps/finance', element: <Finance /> },
          { path: '*', element: <Navigate to="/auth/404" /> },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/auth2/login', element: <Login2 /> },
      { path: '404', element: <Error /> },
      { path: '/auth/404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];

const router = createBrowserRouter(Router);

export default router;
