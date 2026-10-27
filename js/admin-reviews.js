(function () {
  "use strict";

  const login = document.getElementById("adminLogin");
  const panel = document.getElementById("adminPanel");
  const pending = document.getElementById("adminPending");
  const approved = document.getElementById("adminApproved");
  const status = document.getElementById("adminStatus");
  if (!login || !panel || !pending || !approved || !status) return;

  function setStatus(message, isError) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function api(url, options) {
    return fetch(url, Object.assign({
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
    }, options || {})).then(response => response.json().then(body => ({ status: response.status, body })).catch(() => ({ status: response.status, body: {} })));
  }

  function card(review, actions) {
    const item = document.createElement("article");
    item.className = "admin-card";
    const who = document.createElement("h3");
    who.textContent = review.name || "";
    const meta = document.createElement("p");
    meta.className = "admin-meta";
    const bits = [review.rating + " of 5"];
    if (review.eventDate) bits.push(review.eventDate);
    if (review.createdAt) bits.push(review.createdAt.slice(0, 10));
    meta.textContent = bits.join(" · ");
    const text = document.createElement("p");
    text.textContent = review.text || "";
    const row = document.createElement("div");
    row.className = "admin-actions";
    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.kind === "solid" ? "btn btn--solid" : "btn btn--ghost";
      button.textContent = action.label;
      button.addEventListener("click", () => decide(review.id, action.action, button));
      row.appendChild(button);
    });
    item.append(who, meta, text, row);
    return item;
  }

  function render(body) {
    pending.replaceChildren();
    approved.replaceChildren();
    const waiting = body.pending || [];
    const live = body.approved || [];
    if (!waiting.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "No reviews are waiting.";
      pending.appendChild(empty);
    } else {
      waiting.forEach(review => pending.appendChild(card(review, [
        { label: "Approve", action: "approve", kind: "solid" },
        { label: "Reject", action: "reject", kind: "ghost" },
      ])));
    }
    if (!live.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "No reviews are public.";
      approved.appendChild(empty);
    } else {
      live.forEach(review => approved.appendChild(card(review, [
        { label: "Remove", action: "reject", kind: "ghost" },
      ])));
    }
  }

  function load() {
    return api("/api/admin/reviews").then(result => {
      if (result.status === 401) {
        panel.hidden = true;
        login.hidden = false;
        return;
      }
      if (result.status !== 200) {
        setStatus((result.body && result.body.error) || "Reviews could not be loaded.", true);
        return;
      }
      login.hidden = true;
      panel.hidden = false;
      render(result.body || {});
    }).catch(() => setStatus("Reviews could not be loaded.", true));
  }

  function decide(id, action, button) {
    button.disabled = true;
    api("/api/admin/reviews", { method: "POST", body: JSON.stringify({ id, action }) })
      .then(result => {
        if (result.status === 401) {
          panel.hidden = true;
          login.hidden = false;
          setStatus("Sign in again to continue.", true);
          return;
        }
        if (result.status !== 200) {
          setStatus((result.body && result.body.error) || "That change was not saved.", true);
          button.disabled = false;
          return;
        }
        setStatus(action === "approve" ? "Approved. It is now on the home page." : "Removed.", false);
        render(result.body || {});
      })
      .catch(() => {
        setStatus("That change was not saved.", true);
        button.disabled = false;
      });
  }

  login.addEventListener("submit", event => {
    event.preventDefault();
    const password = new FormData(login).get("password");
    const button = login.querySelector("button");
    if (button) button.disabled = true;
    setStatus("", false);
    api("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) })
      .then(result => {
        if (result.status !== 200) {
          setStatus((result.body && result.body.error) || "That password is not right.", true);
          return;
        }
        login.reset();
        return load();
      })
      .catch(() => setStatus("Sign-in did not complete. Please try again.", true))
      .finally(() => {
        if (button) button.disabled = false;
      });
  });

  document.getElementById("adminLogout").addEventListener("click", () => {
    api("/api/admin/session", { method: "DELETE" }).finally(() => {
      panel.hidden = true;
      login.hidden = false;
      setStatus("Signed out.", false);
    });
  });

  load();
})();
