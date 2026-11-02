import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MasterTabBar } from "../components/master/MasterTabBar";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

export function ClientsScreen() {
  const navigate = useNavigate();
  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-cabinet">
      <header className="ms-cab-header">
        <h1 className="ms-cab-title">Клиенты</h1>
      </header>
      <div className="ms-body ms-cab-body">
        <div className="ms-cab-empty">
          <p className="ms-cab-empty-text">Список клиентов скоро появится</p>
        </div>
      </div>
      <MasterTabBar />
    </div>
  );
}
