package pl.piomin.samples.security.callme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/callme")
public class CallmeController {
    @GetMapping("/api")
	public String ping() {
        return "callme api called";
	}
}
