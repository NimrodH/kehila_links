const circlesData = [
  {
    title: "רקפת השקטה",
    text: "קבוצה בה מפורסמות הודעות רשימיות מטעם ועד ההנהלה וועדות. מתוכננת לעבור לאפליקציה ישובית",
    link: "גיל ובעלי תפקידים"
  },
  {
    title: "רקפת הודעות כלליות",
    text: "קבוצת שיח פתוחה של חברי רקפת",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "מיד-ליד (מסירת חפצים)",
    text: "הצעות למסירת חפצים",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "סליחה, אני רק שאלה",
    text: "תיאור הקבוצה, צריך להשלים",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "נשות רקפת- הדור הבא",
    text: "נשות רקפת",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "בייביסיטר רקפת",
    text: "תיאור הקבוצה, צריך להשלים",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "בוגרי רקפת",
    text: "חבר'ה שגדלו בישוב וכעת בוגרים",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "וַתִיקֶפֶת הודעות בלבד",
    text: "פעליות עבור גילאי 60+ בישוב",
    link: "רונית יונגר ושרה פרדס "
  },
  {
    title: "כלבים וחתולים",
    text: "כל בעלי כלבים וחתולים",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "אנשי הפיל",
    text: "מתנדבים בפיל",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "שומרי רקפת",
    text: "מתנדבי שמירה",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "שומרי רקפת דיונים",
    text: "מתנדבי השמירה",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "רקפת על סיבים",
    text: "",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "מינימרקט רקפת",
    text: "לא רק של הישוב",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "רקפת מזון",
    text: "",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "רקפת הודעות ממוקד משגב",
    text: "",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "רקפת למען הדמוקרטיה",
    text: "",
    link: "מנהלי הקבוצה, צריך להשלים"
  },
  {
    title: "מנחי קהילת רקפת",
    text: "קבוצת מנחי שולחנות עגולים",
    link: "מנהלי הקבוצה, צריך להשלים"
  }
];
const circlesContainer = document.getElementById("circlesContainer");

const popupOverlay = document.getElementById("modalBackdrop");
const popupTitle = document.getElementById("modalTitle");
const popupText = document.getElementById("modalText");
const popupManagers = document.getElementById("modalManagers");
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


// DOM fallback, used when circles-3d.js can't start (no WebGL, or the
// Babylon.js script failed to load).
function startDomCircles() {
  createCircles();

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(applyCheckerboard, 150);
  });
}


function showPopup(item) {
  popupTitle.textContent = item.title;
  popupText.textContent = item.text;

  // `link` now holds the group managers' names, shown as plain text.
  if (item.link && item.link.trim() !== "") {
    popupManagers.textContent = "מנהלי הקבוצה: " + item.link;
    popupManagers.style.display = "";
  } else {
    popupManagers.style.display = "none";
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


const started3D =
  window.Circles3D && window.Circles3D.start(circlesContainer, circlesData, showPopup);

if (!started3D) {
  startDomCircles();
}