"use client";

import { useEffect, useState } from "react";
import styles from "./Footer.module.css";

export default function Footer() {
  const [footerLinks, setFooterLinks] = useState([]);

  useEffect(() => {
    fetch("/api/navbar")
      .then((r) => r.json())
      .then((d) => {
        if (d.footerLinks) setFooterLinks(d.footerLinks);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className={styles.footer}>
      <div className={styles.logo}>
        ㅌㅌㄷ<span>.</span>
      </div>
      <div className={styles.text}>
        © 2026 TRAINERS Inc. All rights reserved.
      </div>
      {footerLinks.length > 0 && (
        <div className={styles.links}>
          {footerLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}
    </footer>
  );
}
