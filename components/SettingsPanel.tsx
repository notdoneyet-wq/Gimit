"use client";

import { useEffect, useState } from "react";
import { aiProviders } from "@/data/ai";
import { emptyKeys, keyStorageName, providerStorageName, themeStorageName, type StoredKeys } from "@/lib/settings";
import type { AiProviderId } from "@/types";

export function SettingsPanel() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [provider, setProvider] = useState<AiProviderId>("gemini");
  const [keys, setKeys] = useState<StoredKeys>(emptyKeys);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(themeStorageName) === "dark" ? "dark" : "light";
      const savedProvider = (window.localStorage.getItem(providerStorageName) || "gemini") as AiProviderId;
      const savedKeys = { ...emptyKeys, ...JSON.parse(window.localStorage.getItem(keyStorageName) || "{}") };
      setTheme(savedTheme);
      setProvider(savedProvider);
      setKeys(savedKeys);
      setApiKey(savedKeys[savedProvider]);
    } catch {
      window.localStorage.removeItem(keyStorageName);
    }
  }, []);

  const changeTheme = (value: "light" | "dark") => {
    setTheme(value);
    window.localStorage.setItem(themeStorageName, value);
    document.documentElement.dataset.theme = value;
  };

  const changeProvider = (value: AiProviderId) => {
    setProvider(value);
    setApiKey(keys[value]);
    setMessage("");
    setError("");
  };

  const save = () => {
    const nextKeys = { ...keys, [provider]: apiKey.trim() };
    setKeys(nextKeys);
    window.localStorage.setItem(keyStorageName, JSON.stringify(nextKeys));
    window.localStorage.setItem(providerStorageName, provider);
    setMessage("AI settings saved on this device.");
    setError("");
  };

  const test = async () => {
    if (!apiKey.trim()) {
      setError("Enter an API key before testing the connection.");
      return;
    }
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", provider, apiKey: apiKey.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Connection test failed.");
      setMessage(body.message || "Connection successful.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const resetWorkspace = async () => {
    const confirmed = window.confirm(
      "Reset Gimit on this device? This clears GitHub OAuth setup, saved AI keys, bookmarks, theme, profile analysis, and recommendations.",
    );

    if (!confirmed) {
      return;
    }

    setResetting(true);
    setMessage("");
    setError("");

    try {
      await fetch("/api/auth/github", { method: "DELETE" });
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("gimit-"))
        .forEach((key) => window.localStorage.removeItem(key));
      Object.keys(window.sessionStorage)
        .filter((key) => key.startsWith("gimit-"))
        .forEach((key) => window.sessionStorage.removeItem(key));
      document.documentElement.dataset.theme = "light";
      window.location.assign("/");
    } catch {
      setError("Workspace reset could not be completed. Please try again.");
      setResetting(false);
    }
  };

  return (
    <div className="settings-grid">
      <section className="panel fade-in-card settings-section settings-appearance">
        <div className="panel-header">
          <span className="eyebrow">Appearance</span>
          <h2>Choose your workspace theme.</h2>
        </div>
        <div className="theme-options">
          {(["dark", "light"] as const).map((item) => (
            <button aria-pressed={theme === item} className={theme === item ? "theme-option active" : "theme-option"} key={item} onClick={() => changeTheme(item)} type="button">
              <span className={`theme-preview ${item}`} />
              <strong>{item === "dark" ? "Dark Mode" : "Light Mode"}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="panel fade-in-card settings-section settings-provider">
        <div className="panel-header">
          <span className="eyebrow">AI Provider</span>
          <h2>Change provider and manage your key.</h2>
        </div>
        <div className="provider-list">
          {aiProviders.map((item) => (
            <button aria-pressed={provider === item.id} className={provider === item.id ? "provider-option active" : "provider-option"} key={item.id} onClick={() => changeProvider(item.id)} type="button">
              <span className="provider-mark">{item.name.slice(0, 1)}</span>
              <span><strong>{item.name}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="settings-api-key">API Key</label>
        <input autoComplete="off" className="search-input" id="settings-api-key" onChange={(event) => setApiKey(event.target.value)} placeholder={`Enter your ${provider} API key`} type="password" value={apiKey} />
        <div className="button-stack settings-actions">
          <button className="primary-button" onClick={save} type="button">Save Settings</button>
          <button className="secondary-button" disabled={testing} onClick={test} type="button">{testing ? "Testing..." : "Test Connection"}</button>
        </div>
        <p className="security-note">Keys stay in local browser storage and are sent only to the provider you select.</p>
        {message ? <p className="status-message success fade-in-card">{message}</p> : null}
        {error ? <div className="status-message error fade-in-card" role="alert"><p>{error}</p></div> : null}
      </section>

      <section className="panel fade-in-card settings-section reset-section settings-reset">
        <div className="panel-header">
          <span className="eyebrow">Reset Workspace</span>
          <h2>Return Gimit to its initial state.</h2>
        </div>
        <p className="security-note">
          Clears local GitHub setup, OAuth session cookies, AI provider keys, bookmarks, profile
          analysis, recommendations, theme, and saved preferences on this device.
        </p>
        <button className="secondary-button danger-button" disabled={resetting} onClick={resetWorkspace} type="button">
          {resetting ? "Resetting..." : "Reset Workspace"}
        </button>
      </section>
    </div>
  );
}
