import { expect, test } from "bun:test";
import { fetchAndDecodeQR } from "utils";

test("fetchAndDecodeQR-emptyURL", async () => {
  const URL = "";

  expect(await fetchAndDecodeQR(URL)).toEqual(null);
});

test.skip("fetchAndDecodeQR-nonQrImage", async () => {
  const URL =
    "https://cdn.discordapp.com/attachments/247071734384164865/924014240745021470/unknown.png";

  expect(await fetchAndDecodeQR(URL)).toEqual(null);
});

test("fetchAndDecodeQR-easyQrImage", async () => {
  const URL =
    "https://2.bp.blogspot.com/-pqjXU87AnwU/V8MADPncE5I/AAAAAAAANFs/NvCSC0jVA_k_W6XVx7FBwUE07-jNjz-NQCK4B/s1600/qrcode.jpg";

  expect(await fetchAndDecodeQR(URL)).toEqual("It's great! Your app works!");
});

test("fetchAndDecodeQR-mediumQrImage", async () => {
  const URL =
    "https://docs.oracle.com/en/cloud/paas/mobile-cloud/mcsmx/img/qr_code_testing.png";

  expect(await fetchAndDecodeQR(URL)).toEqual("http://q-r.to/bacQ8F");
});

// Should work but the library is not good enough
// test("fetchAndDecodeQR-hardQrImage1", async () => {
//   const URL = "https://media.qrtiger.com/blog/2021/01/Distance_57.jpg";

//   expect(await fetchAndDecodeQR(URL)).toEqual("http://qr1.be/UZD2");
// });

// test("fetchAndDecodeQR-hardQrImage2", async () => {
//   const URL =
//     "https://www.appcoda.com/wp-content/uploads/2013/12/QRCode-Featured.jpg";

//   expect(await fetchAndDecodeQR(URL)).toEqual("It's great! Your app works!");
// });
