// TODO Create your own get event to your handler function.

import {handler} from "../../functions/Alessio-Revenue/index.js";

async function main() {
    console.log(await handler({
        httpMethod: "GET",
        headers: {
            Authorization: "eyJraWQiOiJYdkVKWjI2RlYxVngxSktIVFo4R1k1MlZlTzBnNGJCMFdiS1BRUGg3alRFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmMDg5OTlkMy02OTdjLTQ0YTAtYjM4OC1hNDE0MTc4ZDRjNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX21QeE5odlNGWCIsImNsaWVudF9pZCI6Ijc4amZyZmhwZGVkNm1lZXZsbHBmbW83M21vIiwib3JpZ2luX2p0aSI6IjgxZmQ3OGVjLTIwNDMtNDYxZC05ZWI2LTM3ZDA2YTYzZjIzNiIsImV2ZW50X2lkIjoiNTI2OTM2NDktNzlhYi00MmQxLWFmNDYtZDQzZDhlNGExNjVkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc1ODEwMjMwNiwiZXhwIjoxNzU4NTM4MDY1LCJpYXQiOjE3NTg1MzQ0NjUsImp0aSI6ImMzNDhhODNiLWQ1NmItNDA2Yi05ZjMwLTRhM2U4Yzk1MzBjMSIsInVzZXJuYW1lIjoiZjA4OTk5ZDMtNjk3Yy00NGEwLWIzODgtYTQxNDE3OGQ0YzViIn0.jKVt6kpHg5w8J4VnKRf3eGUAAsmvUWrm2mPsp42wrC03RObVRVWCyFGSVmjYBN0oZ_kPqTbQgc-_F3_o-3ZAXLWL7BeNqY9sPRSTWinePb7hteRyRc9rHIIni7Bf0c0yqC0X0SlsOzg3KGVkNESNhO91AEl01t4T94Sr5gIeA1a7voX_oeyy3KkGuNPFH5OU8GDOILLGiAn8WrS9R8tT_byOjO7ynkh4bT85yXMUud0ySsu6KJMJ3idZstinxGJie_a7qz_jA85gHnIS_7vFORxwfej3SNoM4rR21-m7t4B_uVuq5vZ4o7KiBY4BJnlvZdyjkA8hnbMIAw3upP8WJA",
        },
        body: {
            hostId: "0f5cc159-c8b2-48f3-bf75-114a10a1d6b3"
        }

    }));
}

main();