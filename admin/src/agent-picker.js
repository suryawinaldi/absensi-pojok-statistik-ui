import { matchingAgents } from "./agent-directory.js";
const pickers = new WeakMap();
let sequence = 0,
  installed = false;

// Enrich native select markup at dialog creation. The submitted value remains
// the agent ID; a typed but unselected name can never be saved as an ID.
export function enhanceAgentPickers(root, agents) {
  if (!installed) {
    document.addEventListener("pointerdown", (event) => {
      document.querySelectorAll("[data-agent-picker]").forEach((picker) => {
        if (!picker.contains(event.target)) pickers.get(picker)?.close();
      });
    });
    installed = true;
  }
  for (const select of root.querySelectorAll('select[name="agent"]')) {
    const uid = `agent-picker-${++sequence}`;
    const allowed = new Set(
      [...select.options]
        .filter((option) => option.value)
        .map((option) => option.value),
    );
    const choices = agents
      .filter((agent) => allowed.has(agent.id))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
    const selected = choices.find((agent) => agent.id === select.value);
    const container = document.createElement("div");
    container.className = "agent-picker";
    container.dataset.agentPicker = "";
    const input = document.createElement("input");
    input.type = "search";
    input.className = "input agent-picker-input";
    input.id = uid;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", `${uid}-options`);
    input.setAttribute(
      "aria-label",
      select.getAttribute("aria-label") || "Cari agen",
    );
    input.placeholder = "Ketik nama";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.disabled = select.disabled;
    input.required = select.required;
    input.maxLength = 160;
    if (select.hasAttribute("aria-describedby"))
      input.setAttribute(
        "aria-describedby",
        select.getAttribute("aria-describedby"),
      );
    input.value = selected?.name || "";
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = select.name;
    hidden.value = selected?.id || "";
    hidden.disabled = select.disabled;
    const popup = document.createElement("ul");
    popup.className = "agent-picker-options";
    popup.id = `${uid}-options`;
    popup.setAttribute("role", "listbox");
    popup.setAttribute("aria-label", "Hasil pencarian agen");
    popup.hidden = true;
    const status = document.createElement("span");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    container.append(input, hidden, popup, status);
    select.replaceWith(container);
    let results = [],
      index = -1;
    function close() {
      popup.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      index = -1;
    }
    function highlight(scroll = false) {
      [...popup.querySelectorAll('[role="option"]')].forEach((option, i) =>
        option.setAttribute("aria-selected", String(i === index)),
      );
      if (index >= 0) {
        input.setAttribute("aria-activedescendant", `${uid}-option-${index}`);
        if (scroll) popup.children[index]?.scrollIntoView({ block: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    }
    function show() {
      if (input.disabled) return;
      results = matchingAgents(
        choices,
        hidden.value && input.value === selected?.name ? "" : input.value,
      );
      index = -1;
      popup.replaceChildren();
      results.forEach((agent, i) => {
        const option = document.createElement("li");
        option.id = `${uid}-option-${i}`;
        option.dataset.index = String(i);
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const name = document.createElement("strong");
        name.textContent = agent.name;
        const meta = document.createElement("span");
        meta.textContent = `${agent.division} · ${agent.position}${agent.active ? "" : " · Nonaktif"}`;
        option.append(name, meta);
        popup.append(option);
      });
      if (!results.length) {
        const empty = document.createElement("li");
        empty.className = "picker-empty";
        empty.textContent =
          "Tidak ada agen yang cocok. Coba potongan nama lain.";
        popup.append(empty);
      }
      popup.hidden = false;
      input.setAttribute("aria-expanded", "true");
      input.removeAttribute("aria-activedescendant");
      status.textContent = `${results.length} agen ditemukan. Pilih nama dari hasil pencarian.`;
    }
    function choose(i) {
      const agent = results[i];
      if (!agent) return;
      hidden.value = agent.id;
      input.value = agent.name;
      input.setCustomValidity("");
      close();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    input.addEventListener("focus", show);
    input.addEventListener("click", () => {
      if (popup.hidden) show();
    });
    input.addEventListener("input", () => {
      hidden.value = "";
      input.setCustomValidity(
        input.value ? "Pilih agen dari hasil pencarian." : "",
      );
      show();
    });
    input.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        if (popup.hidden) show();
        if (!results.length) return;
        index =
          index < 0
            ? event.key === "ArrowDown"
              ? 0
              : results.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + results.length) %
              results.length;
        highlight(true);
      } else if (event.key === "Enter" && !popup.hidden) {
        event.preventDefault();
        if (index >= 0) choose(index);
        else if (results.length === 1) choose(0);
      } else if (event.key === "Escape" && !popup.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === "Tab") close();
    });
    popup.addEventListener("mousedown", (event) => event.preventDefault());
    popup.addEventListener("click", (event) => {
      const option = event.target.closest("[data-index]");
      if (option) {
        choose(Number(option.dataset.index));
        input.focus();
        close();
      }
    });
    pickers.set(container, { close });
  }
}
