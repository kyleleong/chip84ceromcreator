function convertRom() {
  const appVar = document.getElementById("appvar");
  const romFile = document.getElementById("romfile").files[0];

  const errorMessage = document.getElementById("errormessage");
  errorMessage.innerHTML = "";

  if (romFile === undefined) {
    errorMessage.innerHTML = "Bad ROM: You must select a file.";
    return;
  }

  const validAppVarRe = new RegExp("[A-Z0-9]{1,8}");
  if (validAppVarRe.test(appVar.value) === false) {
    errorMessage.innerHTML = "Bad AppVar: Up to eight of A-Z0-9 allowed.";
    appVar.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawBytes = new Uint8Array(e.target.result);

    /* CHIP-8 has 0xFFFF RAM, and 0x200 of that is reserved. */
    if (rawBytes.byteLength > 3584) {
      errorMessage.innerHTML = "Bad ROM: File is larger than CHIP-8 RAM.";
      document.getElementById("romfile").value = null;
      return;
    }

    /* 76 is the total size of the 8XV metadata. */
    const outputSize = rawBytes.byteLength + 76;
    let output = new Uint8Array(outputSize);

    const headerBytes = [
      0x2a, 0x2a, 0x54, 0x49, 0x38, 0x33,	0x46, 0x2a,
      0x1a, 0x0a, 0x00, 0x43, 0x48, 0x49, 0x50, 0x38,
      0x34, 0x43, 0x45, 0x20, 0x52, 0x4f, 0x4d, 0x20,
      0x43, 0x6f, 0x6e, 0x76, 0x65, 0x72, 0x74, 0x65,
      0x72, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00,
    ];

    const dataSectionSize = outputSize - 57;
    const dataSectionSizeBytes = [
      dataSectionSize & 0xFF, (dataSectionSize >>> 8) & 0xFF
    ];

    const dataAndChkSumSize = rawBytes.byteLength + 2;
    const dataAndChkSumSizeBytes = [
      dataAndChkSumSize & 0xFF, (dataAndChkSumSize >>> 8) & 0xFF
    ];

    const progName = new TextEncoder().encode(appVar.value);
    if (progName.byteLength > 8) {
      errorMessage.innerHTML = "Bad AppVar: Too long!";
      appVar.value = "";
      return;
    }

    const secondDataAndChkSumSize = dataAndChkSumSize - 2;
    const secondDataAndChkSumSizeBytes = [
      secondDataAndChkSumSize & 0xFF, (secondDataAndChkSumSize >>> 8) & 0xFF
    ];

    output.set(headerBytes, 0);
    output.set(dataSectionSizeBytes, 53);
    output.set([0x0D, 0x00], 55);
    output.set(dataAndChkSumSizeBytes, 57);
    output.set([0x15], 59);
    output.set(progName, 60);
    output.set([0x00, 0x00], 68);
    output.set(dataAndChkSumSizeBytes, 70);
    output.set(secondDataAndChkSumSizeBytes, 72);
    output.set(rawBytes, 74);

    let checksum = 0;
    for (let i = 0; i <= rawBytes.byteLength + 19; i++) {
      checksum += output[55 + i];
    }
    let checksumBytes = [checksum & 0xFF, (checksum >>> 8) & 0xFF];
    output.set(checksumBytes, 74 + rawBytes.byteLength);

    const blob = new Blob([output], {type: "application/octet-stream"});
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${appVar.value}.8XV`;
    link.click();
  };
  reader.readAsArrayBuffer(romFile);
}
