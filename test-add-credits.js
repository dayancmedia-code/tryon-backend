import fetch from "node-fetch";

async function test() {
  const response = await fetch("http://localhost:3000/add-credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "ahmet@mail.com", // kullanıcı maili
      credits: 100             // yüklemek istediğin kredi
    })
  });

  const data = await response.json();
  console.log("Sonuç:", data);
}

test();
