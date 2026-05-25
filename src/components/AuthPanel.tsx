import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import { signIn, signUp } from "../lib/supabase";

type AuthPanelProps = {
  mode: "masuk" | "daftar";
  onModeChange: (mode: "masuk" | "daftar") => void;
  onSuccess: () => void;
  configured: boolean;
};

export function AuthPanel({ mode, onModeChange, onSuccess, configured }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!configured) {
      setMessage("Supabase belum aktif.");
      return;
    }
    if (password.length < 8) {
      setMessage("Kata sandi minimal 8 karakter.");
      return;
    }

    setIsBusy(true);
    try {
      if (mode === "masuk") {
        await signIn({ email, password });
        onSuccess();
      } else {
        await signUp({ email, password });
        setMessage("Akun dibuat. Periksa email jika konfirmasi aktif.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aksi gagal.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-label={mode === "masuk" ? "Masuk" : "Daftar"}>
      <div className="auth-card__tabs">
        <button
          className={mode === "masuk" ? "is-active" : ""}
          type="button"
          onClick={() => onModeChange("masuk")}
        >
          Masuk
        </button>
        <button
          className={mode === "daftar" ? "is-active" : ""}
          type="button"
          onClick={() => onModeChange("daftar")}
        >
          Daftar
        </button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            autoComplete="email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Kata sandi
          <input
            autoComplete={mode === "masuk" ? "current-password" : "new-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {message && <div className="form-message" role="status">{message}</div>}
        <button className="primary-button" disabled={isBusy} type="submit">
          <Icon icon={mode === "masuk" ? "solar:login-3-linear" : "solar:user-plus-linear"} />
          {isBusy ? "Memproses" : mode === "masuk" ? "Masuk" : "Buat akun"}
        </button>
      </form>
    </section>
  );
}
