import { useStore } from '../store/index.js';

export default function Toast() {
  const toastMsg = useStore(s => s.toastMsg);
  if (!toastMsg) return null;
  return <div className="toast">{toastMsg}</div>;
}
