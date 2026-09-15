const circlesData = [
  {
    title: "רקפת השקטה",
    text: "כולם",
    link: "פתח קישור"
  },
  {
    title: "רקפת הודעות כלליות",
    text: "כולם",
    link: "פתח קישור"
  },
  {
    title: "מיד-ליד (מסירת חפצים)",
    text: "כולם",
    link: "פתח קישור"
  },
  {
    title: "סליחה, אני רק שאלה",
    text: "כולם",
    link: "פתח קישור"
  },
  {
    title: "נשות רקפת- הדור הבא",
    text: "נשות רקפת",
    link: "פתח קישור"
  },
  {
    title: "בייביסיטר רקפת",
    text: "כולם",
    link: "פתח קישור"
  },
  {
    title: "בוגרי רקפת",
    text: "חבר'ה שגדלו בישוב וכעת בוגרים",
    link: "פתח קישור"
  },
  {
    title: "חמשישים",
    text: "גילאי 60+ בישוב",
    link: "פתח קישור"
  },
  {
    title: "כלבים וחתולים",
    text: "כל בעלי כלבים וחתולים",
    link: "פתח קישור"
  },
  {
    title: "אנשי הפיל",
    text: "מתנדבים בפיל",
    link: "פתח קישור"
  },
  {
    title: "שומרי רקפת",
    text: "מתנדבי שמירה",
    link: "פתח קישור"
  },
  {
    title: "שומרי רקפת דיונים",
    text: "מתנדבי השמירה",
    link: "פתח קישור"
  },
  {
    title: "רקפת על סיבים",
    text: "",
    link: "פתח קישור"
  },
  {
    title: "מינימרקט רקפת",
    text: "לא רק של הישוב",
    link: "פתח קישור"
  },
  {
    title: "רקפת מזון",
    text: "",
    link: "פתח קישור"
  },
  {
    title: "רקפת הודעות ממוקד משגב",
    text: "",
    link: "פתח קישור"
  },
  {
    title: "רקפת למען הדמוקרטיה",
    text: "",
    link: "פתח קישור"
  },
  {
    title: "מנחי קהילת רקפת",
    text: "קבוצת מנחי שולחנות עגולים",
    link: "פתח קישור"
  }
];
const circlesContainer = document.getElementById("circlesContainer");

const popupOverlay = document.getElementById("modalBackdrop");
const popupTitle = document.getElementById("modalTitle");
const popupText = document.getElementById("modalText");
const popupLink = document.getElementById("modalLink");
const closePopupButton = document.getElementById("closeModal");


function createCircles() {
  circlesContainer.innerHTML = "";

  circlesData.forEach((item, index) => {
    const circle = document.createElement("div");
    circle.className = "circle";

    const title = document.createElement("button");
    title.className = "circle-title";
    title.type = "button";
    title.textContent = item.title;

    circle.addEventListener("click", () => {
      showPopup(item);
    });

    title.addEventListener("click", (event) => {
      event.stopPropagation();
      showPopup(item);
    });

    circle.appendChild(title);
    circlesContainer.appendChild(circle);
  });

  applyCheckerboard();
}


// The grid uses auto-fit columns, so the column count changes with
// viewport width. Group circles into rows by their actual offsetTop and
// alternate tones by (row + column) so the checkerboard holds for any
// column count, not just odd counts or a hardcoded 2-column case.
function applyCheckerboard() {
  const circles = Array.from(circlesContainer.querySelectorAll(".circle"));
  const rowTolerance = 2;

  const rows = [];
  circles.forEach((circle) => {
    const top = circle.offsetTop;
    const row = rows.find((r) => Math.abs(r.top - top) <= rowTolerance);
    if (row) {
      row.items.push(circle);
    } else {
      rows.push({ top, items: [circle] });
    }
  });

  rows.forEach((row, rowIndex) => {
    row.items.forEach((circle, colIndex) => {
      const toneB = (rowIndex + colIndex) % 2 === 1;
      circle.classList.toggle("tone-b", toneB);
      circle.classList.toggle("tone-a", !toneB);
    });
  });
}


let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(applyCheckerboard, 150);
});


function showPopup(item) {
  popupTitle.textContent = item.title;
  popupText.textContent = item.text;

  if (item.link && item.link.trim() !== "") {
    popupLink.href = item.link;
    popupLink.textContent = "פתח קישור";
    popupLink.style.display = "inline-block";
  } else {
    popupLink.style.display = "none";
    popupLink.removeAttribute("href");
  }

  popupOverlay.classList.add("open");
}


function closePopup() {
  popupOverlay.classList.remove("open");
}


closePopupButton.addEventListener("click", closePopup);


popupOverlay.addEventListener("click", (event) => {
  if (event.target === popupOverlay) {
    closePopup();
  }
});


document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopup();
  }
});


createCircles();